import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getSessionUserId } from '@/lib/auth/session'
import {
  parseExpedienteDownloadDocType,
} from '@/lib/expediente/descarga-catalog'
import {
  withExpedienteDocxPreviewCacheHeaders,
  withExpedienteDocxPreviewDisposition,
} from '@/lib/expediente/descarga-preview'
import {
  buildExpedienteDocxDynamicVariant,
  buildExpedienteDocxPreviewEtag,
  previewEtagMatchesIfNoneMatch,
} from '@/lib/expediente/preview-etag'
import { mapExpedienteDocxErrorToHttp } from '@/lib/expediente/docx/errors'
import { getExpedienteDocxDocumentDefinition } from '@/lib/expediente/docx/definitions'
import { DYNAMIC_RENDERERS } from '@/lib/expediente/docx/renderer-registry'
import { serverBaroGetData } from '@/lib/api/server'
import type { BaroExpedienteDto } from '@hubilee/contracts'

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

  try {
    const row = await serverBaroGetData<BaroExpedienteDto>(`/expedientes/${id}`)
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

    if (!definition.dynamic) {
      return new NextResponse(null, { status: 404 })
    }

    const dynamicVariant = buildExpedienteDocxDynamicVariant(request.nextUrl.searchParams)

    const etag = buildExpedienteDocxPreviewEtag({
      expedienteId: id,
      docTipo: tipo,
      expedienteUpdatedAt: new Date(row.updatedAt),
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
  } catch (err: unknown) {
    const mapped = mapExpedienteDocxErrorToHttp(err)
    return new NextResponse(mapped.body, { status: mapped.status })
  }
}
