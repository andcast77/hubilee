import { Document, FootnoteReferenceRun, Packer, PageBreak, Paragraph, type Table } from 'docx'
import type { DynamicDocxRenderContext } from '../renderer-context'
import { NextResponse } from 'next/server'
import type { CitacionRenderData, ColindanteDto } from '../document-render-data'
import {
  expedienteCitacionFindArgs,
  expedienteRowToCitacionRenderData,
} from '../document-render-data'
import { cardinalFromRumbo } from '../cardinales'
import {
  buildConsultasFooterText,
  buildFirmasTable,
  pBlankLine,
  pBody,
  pBodyRuns,
  pTitle,
  runBody,
} from '../render-utils'
import { expedienteDocxStandardSectionPage } from '../word-page-layout'
import {
  EXPEDIENTE_DOCX_MIME,
  buildExpedienteDocxAttachmentFilename,
  getExpedienteDownloadDocMeta,
  sanitizeExpedienteNomenclaturaForFilename,
} from '@/lib/expediente/descarga'
import { prisma } from '@/lib/prisma'

const DOTS = '……………………………………..'

function packCitacionDoc(
  children: (Paragraph | Table)[],
  consultasLine: string | null
): Promise<Buffer> {
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

function t(s: string): string {
  return s.trim()
}

function linderoCitacionPhrase(c: ColindanteDto): string {
  const segs = c.nomenclaturas.map((n) => {
    const card = cardinalFromRumbo(n.rumbo)
    const borde = card
      ? `el ${card}`
      : t(n.rumbo)
        ? t(n.rumbo)
        : 'el límite consignado en la planilla'
    const nc = t(n.nomenclatura)
    const ncFrag = nc || DOTS
    return `por ${borde}, con la parcela N.C. ${ncFrag}`
  })
  if (segs.length === 0) {
    return `linda con el colindante consignado en la planilla (${DOTS}), de su propiedad`
  }
  if (segs.length === 1) return `linda ${segs[0]}, de su propiedad`
  return `linda ${segs[0]}${segs
    .slice(1)
    .map((s) => `; y ${s}`)
    .join('')}, de su propiedad`
}

/** Listado para el encabezado de la carta (varias NC con cardinal). */
function nomenclaturasCitadasLine(c: ColindanteDto, dots: string): string {
  const parts: string[] = []
  for (const n of c.nomenclaturas) {
    const nc = t(n.nomenclatura)
    if (!nc) continue
    const card = cardinalFromRumbo(n.rumbo)
    const cardTxt = card ? card : t(n.rumbo) ? t(n.rumbo) : ''
    parts.push(cardTxt ? `${nc} (${cardTxt})` : nc)
  }
  return parts.length > 0 ? parts.join('; ') : dots
}

/** Una comunicación por colindante (mismo pie de consultas que edicto / orden de trabajo: nota al pie). */
export function buildComunicacionMensuraChildrenForColindante(
  data: CitacionRenderData,
  c: ColindanteDto,
  consultasLine: string | null
): (Paragraph | Table)[] {
  const {
    nomenclaturaCatastral,
    propietario,
    domicilioParcelaMensurar,
    parcial,
    inscripcionDominio,
    lugarReunion,
    toleranciaActa,
    fechaCartaLinea,
    fechaHoraInicioMensuraLinea,
    principal,
    segundo,
  } = data

  const domicilioMensurar = t(domicilioParcelaMensurar) || DOTS
  const ncMensurar = `${nomenclaturaCatastral}${parcial ? ' (parcial)' : ''}`
  const insc = t(inscripcionDominio)

  const lugar = t(lugarReunion) || DOTS
  const tolerancia = t(toleranciaActa) || 'una hora'

  return [
    pTitle('COMUNICACIÓN DE MENSURA'),
    pBlankLine(),
    pBody(`Titular: ${t(c.colindante) || DOTS}.-`),
    pBody(`Nomenclatura catastral citada: ${nomenclaturasCitadasLine(c, DOTS)}.-`),
    pBody(`Domicilio parcela (colindancia): ${t(c.domicilioParcelaColindante) || DOTS}.-`),
    pBody(`Domicilio del titular: ${t(c.domicilioTitularColindante) || DOTS}.-`),
    pBody(`Notificar a: ${t(c.notificaA) || DOTS}.-`),
    ...(t(c.dirigidoA) ? [pBody(`Dirigido a: ${t(c.dirigidoA)}.-`)] : []),
    pBlankLine(),
    pBody(fechaCartaLinea),
    pBlankLine(),
    pBody('Sr. Colindante:'),
    pBlankLine(),
    pBody(
      `Comunicamos a Ud. que ${fechaHoraInicioMensuraLinea}, iniciaremos la operación de MENSURA de la parcela N.C. ${ncMensurar}, ubicada en calle ${domicilioMensurar}.`
    ),
    pBody(
      `La parcela se encuentra registrada en la Dirección de Geodesia y Catastro y en el Registro General Inmobiliario a nombre de ${t(propietario) || DOTS}${insc ? `, al ${insc}` : ''}.-`
    ),
    pBody(
      `En virtud de que la parcela a mensurar, ${linderoCitacionPhrase(c)}, citámosle para que concurra al acto, acompañado si lo considera pertinente, por perito a su elección y cargo, para que, si las hubiere, formule los reclamos a que se creyere con derecho.`
    ),
    pBody(`Lugar de Reunión: ${lugar}.`),
    pBody(
      `Los profesionales actuantes tendrán una tolerancia para llegar al lugar de reunión como máximo de: ${tolerancia}.`
    ),
    pBody('Queda usted debidamente notificado. Sin otro particular le saludamos atte.'),
    pBlankLine(),
    pBody('Firma ..........................................................'),
    pBody('Aclaración ....................................................'),
    pBody('D.N.I. ........................................................'),
    pBody('Condición .....................................................'),
    pBody('Fecha de Notificación .........................................'),
    pBlankLine(),
    buildFirmasTable({ ordenantes: [], principal, segundo }),
    ...(consultasLine ? [pBodyRuns([runBody(' '), new FootnoteReferenceRun(1)])] : []),
  ]
}

function buildComunicacionMensuraEmptyChildren(
  data: CitacionRenderData,
  consultasLine: string | null
): (Paragraph | Table)[] {
  const { principal, segundo, nomenclaturaCatastral, fechaCartaLinea } = data
  return [
    pTitle('COMUNICACIÓN DE MENSURA'),
    pBlankLine(),
    pBody(`Nomenclatura Catastral (parcela a mensurar): ${nomenclaturaCatastral}.-`),
    pBlankLine(),
    pBody(fechaCartaLinea),
    pBlankLine(),
    pBody(
      '(No hay colindantes cargados en el expediente. Agregá colindantes para generar las comunicaciones.)'
    ),
    pBlankLine(),
    buildFirmasTable({ ordenantes: [], principal, segundo }),
    ...(consultasLine ? [pBodyRuns([runBody(' '), new FootnoteReferenceRun(1)])] : []),
  ]
}

export async function renderCitacionTodasEnUnDocumento(data: CitacionRenderData): Promise<Buffer> {
  const consultasLine = buildConsultasFooterText(data.principal)
  if (data.colindantes.length === 0) {
    return packCitacionDoc(
      buildComunicacionMensuraEmptyChildren(data, consultasLine),
      consultasLine
    )
  }
  const merged: (Paragraph | Table)[] = []
  for (let i = 0; i < data.colindantes.length; i++) {
    if (i > 0) {
      merged.push(new Paragraph({ children: [new PageBreak()] }))
    }
    merged.push(
      ...buildComunicacionMensuraChildrenForColindante(data, data.colindantes[i]!, consultasLine)
    )
  }
  return packCitacionDoc(merged, consultasLine)
}

export async function renderCitacionUnSoloColindante(
  data: CitacionRenderData,
  c: ColindanteDto
): Promise<Buffer> {
  const consultasLine = buildConsultasFooterText(data.principal)
  return packCitacionDoc(
    buildComunicacionMensuraChildrenForColindante(data, c, consultasLine),
    consultasLine
  )
}

function buildCitacionColindanteFilename(nomenclaturaCatastral: string, c: ColindanteDto): string {
  const nc = sanitizeExpedienteNomenclaturaForFilename(nomenclaturaCatastral)
  const slug = sanitizeExpedienteNomenclaturaForFilename(
    c.colindante.slice(0, 56) || `orden-${c.orden}`
  )
  return `ComunicacionMensuraColindante_${nc}_${slug}.docx`
}

export async function handleCitacionDownload(
  expedienteId: string,
  userId: string,
  ctx?: DynamicDocxRenderContext
): Promise<NextResponse> {
  const row = await prisma.expediente.findFirst({
    where: { id: expedienteId, accountOwnerId: userId },
    ...expedienteCitacionFindArgs,
  })
  if (!row) return new NextResponse(null, { status: 404 })

  const payload = expedienteRowToCitacionRenderData(row)
  const colId = ctx?.request?.nextUrl.searchParams.get('colindanteId')?.trim() ?? null

  let body: Buffer
  let filename: string

  if (colId) {
    const c = payload.colindantes.find((x) => x.id === colId)
    if (!c) return new NextResponse(null, { status: 404 })
    body = await renderCitacionUnSoloColindante(payload, c)
    filename = buildCitacionColindanteFilename(row.nomenclaturaCatastral, c)
  } else {
    body = await renderCitacionTodasEnUnDocumento(payload)
    const meta = getExpedienteDownloadDocMeta('citacion-colindantes')
    filename = buildExpedienteDocxAttachmentFilename(meta, row.nomenclaturaCatastral)
  }

  return new NextResponse(new Uint8Array(body), {
    status: 200,
    headers: {
      'Content-Type': EXPEDIENTE_DOCX_MIME,
      'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  })
}
