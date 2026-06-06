import { Document, Packer, Paragraph, TextRun } from 'docx'
import { NextResponse } from 'next/server'
import { getSessionUserId } from '@/lib/auth/session'
import {
  EXPEDIENTE_DOCX_MIME,
  getExpedienteDownloadDocMeta,
  parseExpedienteDownloadDocType,
  sanitizeExpedienteNomenclaturaForFilename,
} from '@/lib/expediente/descarga'

function buildBlankFormDocx(label: string): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [new TextRun({ text: label.toUpperCase(), bold: true })],
          }),
          new Paragraph({ children: [new TextRun('')] }),
          new Paragraph({
            children: [new TextRun('Formulario en blanco generado automáticamente.')],
          }),
          new Paragraph({
            children: [
              new TextRun('Completá los datos correspondientes antes de su presentación.'),
            ],
          }),
        ],
      },
    ],
  })
  return Packer.toBuffer(doc)
}

const PDF_RETIRADO_MSG =
  'El formato PDF ya no está disponible. La descarga es solo en DOCX (format=docx o sin parámetro).'

export async function GET(request: Request, context: { params: Promise<{ tipo: string }> }) {
  const userId = await getSessionUserId()
  if (!userId) return new NextResponse(null, { status: 404 })

  const { tipo: tipoRaw } = await context.params
  const tipo = parseExpedienteDownloadDocType(tipoRaw)
  if (!tipo) return new NextResponse(null, { status: 404 })

  const meta = getExpedienteDownloadDocMeta(tipo)
  const attachmentName = sanitizeExpedienteNomenclaturaForFilename(
    `${meta.attachmentBasePrefix}_Formulario`
  )
  const url = new URL(request.url)
  const formatParam = url.searchParams.get('format')?.toLowerCase() ?? null

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

  const docxBuffer = await buildBlankFormDocx(meta.label)
  return new NextResponse(new Uint8Array(docxBuffer), {
    status: 200,
    headers: {
      'Content-Type': EXPEDIENTE_DOCX_MIME,
      'Content-Disposition': `attachment; filename="${attachmentName}.docx"; filename*=UTF-8''${encodeURIComponent(attachmentName)}.docx`,
      'Cache-Control': 'no-store',
    },
  })
}
