import { readFile, stat } from 'node:fs/promises'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getSessionUserId } from '@/lib/auth/session'
import {
  EXPEDIENTE_DOCX_MIME,
  buildExpedienteDocxAttachmentFilename,
  getExpedienteDownloadDocMeta,
  parseExpedienteDownloadDocType,
  resolveExpedienteDocTemplateAbsolutePath,
  withExpedienteDocxPreviewCacheHeaders,
  withExpedienteDocxPreviewDisposition,
} from '@/lib/expediente/descarga'
import {
  buildExpedienteDocxDynamicVariant,
  buildExpedienteDocxPreviewEtag,
  previewEtagMatchesIfNoneMatch,
} from '@/lib/expediente/preview-etag'
import { ExpedienteDocxError, mapExpedienteDocxErrorToHttp } from '@/lib/expediente/docx/errors'
import { getExpedienteDocxDocumentDefinition } from '@/lib/expediente/docx/definitions'
import { DYNAMIC_RENDERERS } from '@/lib/expediente/docx/renderer-registry'
import { prisma } from '@/lib/prisma'

const PDF_RETIRADO_MSG =
  'El formato PDF ya no está disponible. Usá descarga en DOCX (format=docx o sin parámetro).'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; tipo: string }> }
) {
  const formatParam = request.nextUrl.searchParams.get('format')?.toLowerCase() ?? null
  const preview = request.nextUrl.searchParams.get('preview') === '1'
  const { id, tipo: tipoRaw } = await context.params

  if (formatParam === 'pdf') {
    return new NextResponse(PDF_RETIRADO_MSG, {
      status: 410,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  const format = formatParam ?? 'docx'
  if (format !== 'docx') {
    return new NextResponse(null, { status: 400 })
  }

  const userId = await getSessionUserId()
  if (!userId) {
    console.warn('[expediente-descargar] 404 no-session', { id, tipoRaw, preview, format })
    return new NextResponse(null, { status: 404 })
  }

  const tipo = parseExpedienteDownloadDocType(tipoRaw)
  if (!tipo) {
    console.warn('[expediente-descargar] 404 invalid-tipo', {
      id,
      tipoRaw,
      userId,
      preview,
      format,
    })
    return new NextResponse(null, { status: 404 })
  }

  const definition = getExpedienteDocxDocumentDefinition(tipo)
  const meta = getExpedienteDownloadDocMeta(tipo)

  try {
    const row = await prisma.expediente.findFirst({
      where: { id, accountOwnerId: userId },
      select: { updatedAt: true, nomenclaturaCatastral: true },
    })
    if (!row) {
      console.warn('[expediente-descargar] 404 expediente-not-found-for-user', {
        id,
        tipo,
        userId,
        preview,
        format,
      })
      return new NextResponse(null, { status: 404 })
    }

    let staticTemplateMtimeMs: number | undefined
    let staticAbsolute: string | null = null

    if (!definition.dynamic) {
      const templatePath = meta.templateFileName.trim()
      if (!templatePath) {
        const mapped = mapExpedienteDocxErrorToHttp(
          new ExpedienteDocxError('plantilla_faltante', 'Sin plantilla estática')
        )
        return new NextResponse(mapped.body, { status: mapped.status })
      }
      staticAbsolute = resolveExpedienteDocTemplateAbsolutePath(templatePath)
      try {
        const st = await stat(staticAbsolute)
        staticTemplateMtimeMs = st.mtimeMs
      } catch {
        throw new ExpedienteDocxError(
          'plantilla_faltante',
          `Plantilla no encontrada: ${templatePath}`
        )
      }
    }

    const dynamicVariant = definition.dynamic
      ? buildExpedienteDocxDynamicVariant(request.nextUrl.searchParams)
      : undefined

    const etag = buildExpedienteDocxPreviewEtag({
      expedienteId: id,
      docTipo: tipo,
      expedienteUpdatedAt: row.updatedAt,
      staticTemplateMtimeMs,
      dynamicVariant,
    })

    const ifNoneMatch = request.headers.get('if-none-match')
    if (preview && previewEtagMatchesIfNoneMatch(ifNoneMatch, etag)) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          'Cache-Control': 'private, no-cache',
        },
      })
    }

    if (definition.dynamic) {
      const renderer = DYNAMIC_RENDERERS[tipo]
      if (!renderer) {
        return new NextResponse(null, { status: 404 })
      }
      const res = await renderer(id, userId, { request })
      const withDisposition = withExpedienteDocxPreviewDisposition(res, preview)
      if (withDisposition.status !== 200) {
        return withDisposition
      }
      return withExpedienteDocxPreviewCacheHeaders(withDisposition, etag)
    }

    let body: Buffer
    try {
      body = await readFile(staticAbsolute!)
    } catch {
      const templatePath = meta.templateFileName.trim()
      throw new ExpedienteDocxError(
        'plantilla_faltante',
        `Plantilla no encontrada: ${templatePath}`
      )
    }

    const baseFilename = buildExpedienteDocxAttachmentFilename(meta, row.nomenclaturaCatastral)

    const staticRes = new NextResponse(new Uint8Array(body), {
      status: 200,
      headers: {
        'Content-Type': EXPEDIENTE_DOCX_MIME,
        'Content-Disposition': `attachment; filename="${baseFilename}"; filename*=UTF-8''${encodeURIComponent(baseFilename)}`,
      },
    })
    const withDisposition = withExpedienteDocxPreviewDisposition(staticRes, preview)
    return withExpedienteDocxPreviewCacheHeaders(withDisposition, etag)
  } catch (err: unknown) {
    const mapped = mapExpedienteDocxErrorToHttp(err)
    return new NextResponse(mapped.body, { status: mapped.status })
  }
}
