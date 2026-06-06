import { Document, FootnoteReferenceRun, Packer, Paragraph, type Table } from 'docx'
import { NextResponse } from 'next/server'
import type { DynamicDocxRenderContext } from '../renderer-context'
import type { EdictoRenderData } from '../document-render-data'
import { expedienteEdictoFindArgs, expedienteRowToEdictoRenderData } from '../document-render-data'
import { buildConsultasFooterText, pBodyRuns, pTitle, runBody } from '../render-utils'
import { expedienteDocxStandardSectionPage } from '../word-page-layout'
import { ExpedienteDocxError, mapExpedienteDocxErrorToHttp } from '../errors'
import {
  EXPEDIENTE_DOCX_MIME,
  buildExpedienteDocxAttachmentFilename,
  getExpedienteDownloadDocMeta,
} from '@/lib/expediente/descarga'
import { parseActaNotarialFechaToDate } from '@/lib/expediente/acta-notarial-fecha'
import { prisma } from '@/lib/prisma'

function t(s: string | null | undefined): string {
  return (s ?? '').trim()
}

export async function renderEdicto(data: EdictoRenderData): Promise<Buffer> {
  const {
    principal,
    segundo,
    tipoMensuraLabel,
    actaNotarialFecha,
    toleranciaActa,
    nomenclaturaCatastral,
    parcial,
    propietario,
    domicilioParcela,
    colindanteTitular,
    colindanteNomenclatura,
    lugarReunion,
  } = data

  const fechaActa = parseActaNotarialFechaToDate(actaNotarialFecha)
  const dia = fechaActa?.toLocaleDateString('es-AR', { day: 'numeric' }) ?? '___'
  const mesAnio =
    fechaActa?.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }) ?? '____________'
  const hora =
    fechaActa?.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }) ??
    '____'

  const nombreA = t(principal.displayName)
  const tituloA = t(principal.tituloEs)
  const mcpA = t(principal.mcp)
  const nombreB = t(segundo?.displayName)
  const tituloB = t(segundo?.tituloEs)
  const mcpB = t(segundo?.mcp)

  const tipoTrabajo = t(tipoMensuraLabel).toLocaleUpperCase('es-AR')
  const tolerancia = t(toleranciaActa)
  const nc = t(nomenclaturaCatastral)
  const parcialTxt = parcial ? ' (parcial)' : ''
  const titular = t(propietario)
  const domicilio = t(domicilioParcela)
  const colindante = t(colindanteTitular)
  const colNc = t(colindanteNomenclatura)
  const reunion = t(lugarReunion)
  const profesionalesFrase =
    segundo && nombreB
      ? `${nombreA}, ${tituloA} M.C.P. ${mcpA} y ${nombreB}, ${tituloB} M.C.P. ${mcpB}, realizarán la `
      : `${nombreA}, ${tituloA} M.C.P. ${mcpA}, realizará la `
  const citaFrase =
    t(colindanteTitular) || t(colindanteNomenclatura)
      ? ` Cito expresamente a ${colindante}, N.C. ${colNc}, colindante por el Norte.`
      : ''
  const consultasLine = buildConsultasFooterText(principal)

  const children: (Paragraph | Table)[] = [
    pTitle('EDICTO DE MENSURA'),
    pBodyRuns([
      runBody(profesionalesFrase),
      runBody(tipoTrabajo, { bold: true }),
      runBody(
        ` el día ${dia} de ${mesAnio} a las ${hora} horas, con ${tolerancia} de tolerancia, parcela Nomenclatura Catastral ${nc}${parcialTxt}, registrada en la Dirección de Geodesia y Catastro y en el Registro General Inmobiliario a nombre de ${titular}, ubicada en ${domicilio}.${citaFrase} Lugar de Reunión: ${reunion}. Cito colindantes e interesados.`
      ),
    ]),
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
        properties: { page: expedienteDocxStandardSectionPage() },
        children,
      },
    ],
  })
  return Packer.toBuffer(doc)
}

export async function handleEdictoDownload(
  expedienteId: string,
  userId: string,
  _ctx?: DynamicDocxRenderContext
): Promise<NextResponse> {
  void _ctx
  const row = await prisma.expediente.findFirst({
    where: { id: expedienteId, accountOwnerId: userId },
    ...expedienteEdictoFindArgs,
  })
  if (!row) return new NextResponse(null, { status: 404 })

  const data = expedienteRowToEdictoRenderData(row)

  if (!data.medioPublicacion || !data.publicacionEdictoFecha) {
    const mapped = mapExpedienteDocxErrorToHttp(
      new ExpedienteDocxError(
        'datos_faltantes',
        'Completá el medio de publicación y la fecha del edicto antes de descargar este documento.'
      )
    )
    return new NextResponse(mapped.body, { status: mapped.status })
  }

  const body = await renderEdicto(data)
  const meta = getExpedienteDownloadDocMeta('edicto')
  const filename = buildExpedienteDocxAttachmentFilename(meta, row.nomenclaturaCatastral)
  return new NextResponse(new Uint8Array(body), {
    status: 200,
    headers: {
      'Content-Type': EXPEDIENTE_DOCX_MIME,
      'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  })
}
