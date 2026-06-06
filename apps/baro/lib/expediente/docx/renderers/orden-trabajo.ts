import { Document, FootnoteReferenceRun, Packer, Paragraph } from 'docx'
import { NextResponse } from 'next/server'
import type { DynamicDocxRenderContext } from '../renderer-context'
import type { OrdenTrabajoRenderData } from '../document-render-data'
import {
  expedienteOrdenTrabajoFindArgs,
  expedienteRowToOrdenTrabajoRenderData,
  ORDEN_TRABAJO_DOC_ID,
} from '../document-render-data'
import { buildOrdenTrabajoMandateBody, ORDEN_TRABAJO_VIGENCIA_TEXT } from '../orden-trabajo-text'
import {
  buildConsultasFooterText,
  buildFirmasTable,
  pBody,
  pBodyRuns,
  pFechaRight,
  pTitle,
  runBody,
} from '../render-utils'
import { expedienteDocxStandardSectionPage } from '../word-page-layout'
import { ExpedienteDocxError } from '../errors'
import { mapExpedienteDocxErrorToHttp } from '../errors'
import {
  EXPEDIENTE_DOCX_MIME,
  buildExpedienteDocxAttachmentFilename,
  getExpedienteDownloadDocMeta,
} from '@/lib/expediente/descarga'
import { prisma } from '@/lib/prisma'

/** Genera `.docx` conforme modelo `context/OrdenDeTrabajo.pdf` + reglas acordadas. */
export async function renderOrdenDeTrabajo(data: OrdenTrabajoRenderData): Promise<Buffer> {
  const { ordenantes, principal, segundo } = data
  const firmasTable = buildFirmasTable({ ordenantes, principal, segundo })
  const consultasLine = buildConsultasFooterText(principal)

  const page1 = [
    pTitle('ORDEN DE TRABAJO'),
    pFechaRight(data.fechaOrdenTrabajoLinea),
    pBody(buildOrdenTrabajoMandateBody(data)),
    pBody(ORDEN_TRABAJO_VIGENCIA_TEXT),
    firmasTable,
    ...(consultasLine ? [pBodyRuns([runBody(' '), new FootnoteReferenceRun(1)])] : []),
  ]

  const doc = new Document({
    ...(consultasLine
      ? {
          footnotes: {
            1: {
              children: [new Paragraph(consultasLine)],
            },
          },
        }
      : {}),
    sections: [
      {
        properties: {
          page: expedienteDocxStandardSectionPage(),
        },
        children: page1,
      },
    ],
  })

  return Packer.toBuffer(doc)
}

export async function handleOrdenTrabajoDownload(
  expedienteId: string,
  userId: string,
  _ctx?: DynamicDocxRenderContext
): Promise<NextResponse> {
  void _ctx
  const row = await prisma.expediente.findFirst({
    where: { id: expedienteId, accountOwnerId: userId },
    ...expedienteOrdenTrabajoFindArgs,
  })
  if (!row) {
    return new NextResponse(null, { status: 404 })
  }
  const fechaOt = row.fechaOrdenTrabajo?.trim()
  if (!fechaOt) {
    const mapped = mapExpedienteDocxErrorToHttp(
      new ExpedienteDocxError(
        'datos_faltantes',
        'Completá la fecha de la orden de trabajo y guardá antes de descargar este documento.'
      )
    )
    return new NextResponse(mapped.body, { status: mapped.status })
  }
  const payload = expedienteRowToOrdenTrabajoRenderData(row)
  const body = await renderOrdenDeTrabajo(payload)
  const meta = getExpedienteDownloadDocMeta(ORDEN_TRABAJO_DOC_ID)
  const filename = buildExpedienteDocxAttachmentFilename(meta, row.nomenclaturaCatastral)
  return new NextResponse(new Uint8Array(body), {
    status: 200,
    headers: {
      'Content-Type': EXPEDIENTE_DOCX_MIME,
      'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  })
}
