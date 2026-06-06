import { Document, Packer, type Paragraph, type Table } from 'docx'
import { NextResponse } from 'next/server'
import type { DynamicDocxRenderContext } from '../renderer-context'
import type { NotaFiscaliaRenderData } from '../document-render-data'
import {
  expedienteNotaFiscaliaFindArgs,
  expedienteRowToNotaFiscaliaRenderData,
} from '../document-render-data'
import { buildFirmasTable, pBlankLine, pBody, pBodyCenteredBold } from '../render-utils'
import { expedienteDocxStandardSectionPage } from '../word-page-layout'
import {
  EXPEDIENTE_DOCX_MIME,
  buildExpedienteDocxAttachmentFilename,
  getExpedienteDownloadDocMeta,
} from '@/lib/expediente/descarga'
import { prisma } from '@/lib/prisma'

export async function renderNotaFiscalia(data: NotaFiscaliaRenderData): Promise<Buffer> {
  const { principal, nomenclaturaCatastral, tipoMensuraLabel, motivoFiscalia } = data

  const children: (Paragraph | Table)[] = [
    pBodyCenteredBold('NOTA'),
    pBlankLine(),
    pBody('A la Fiscalía de Estado'),
    pBlankLine(),
    pBody(
      `Nomenclatura Catastral: ${nomenclaturaCatastral}${tipoMensuraLabel ? ` — ${tipoMensuraLabel}` : ''}`
    ),
    pBlankLine(),
  ]

  if (motivoFiscalia) {
    for (const line of motivoFiscalia.split('\n')) {
      children.push(pBody(line.trim()))
    }
    children.push(pBlankLine())
  }

  children.push(pBlankLine())
  children.push(buildFirmasTable({ ordenantes: [], principal, segundo: null }))

  const doc = new Document({
    sections: [{ properties: { page: expedienteDocxStandardSectionPage() }, children }],
  })
  return Packer.toBuffer(doc)
}

export async function handleNotaFiscaliaDownload(
  expedienteId: string,
  userId: string,
  _ctx?: DynamicDocxRenderContext
): Promise<NextResponse> {
  void _ctx
  const row = await prisma.expediente.findFirst({
    where: { id: expedienteId, accountOwnerId: userId },
    ...expedienteNotaFiscaliaFindArgs,
  })
  if (!row) return new NextResponse(null, { status: 404 })

  const payload = expedienteRowToNotaFiscaliaRenderData(row)
  const body = await renderNotaFiscalia(payload)
  const meta = getExpedienteDownloadDocMeta('nota-fiscalia')
  const filename = buildExpedienteDocxAttachmentFilename(meta, row.nomenclaturaCatastral)
  return new NextResponse(new Uint8Array(body), {
    status: 200,
    headers: {
      'Content-Type': EXPEDIENTE_DOCX_MIME,
      'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  })
}
