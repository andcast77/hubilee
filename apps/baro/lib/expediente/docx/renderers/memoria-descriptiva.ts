import { Document, FootnoteReferenceRun, Packer, Paragraph, type Table } from 'docx'
import { NextResponse } from 'next/server'
import type { DynamicDocxRenderContext } from '../renderer-context'
import type { MemoriaDescriptivaRenderData } from '../document-render-data'
import {
  expedienteMemoriaDescriptivaFindArgs,
  expedienteRowToMemoriaDescriptivaRenderData,
} from '../document-render-data'
import {
  buildConsultasFooterText,
  buildFirmasTable,
  formatCardinalesColindantes,
  pBlankLine,
  pBody,
  pBodyRuns,
  pFechaRight,
  pTitle,
  runBody,
} from '../render-utils'
import { expedienteDocxStandardSectionPage } from '../word-page-layout'
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

export async function renderMemoriaDescriptiva(
  data: MemoriaDescriptivaRenderData
): Promise<Buffer> {
  const {
    principal,
    segundo,
    nomenclaturaCatastral,
    tipoMensuraLabel,
    parcial,
    propietario,
    domicilioParcela,
    inscripcionDominio,
    planoAntecedente,
    actaNotarialFecha,
    memoriaObservaciones,
    ordenanteNombreCompleto,
    ordenanteDocumento,
    ordenanteCuit,
    ordenanteDomicilio,
    ordenanteCaracter,
    publicacionEdictoFecha,
    medioPublicacion,
    llevPublicacionEdictos,
    colindantes,
  } = data

  const fechaActa = parseActaNotarialFechaToDate(actaNotarialFecha)
  const fechaLarga =
    fechaActa?.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }) ??
    '________________'
  const hora =
    fechaActa?.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }) ??
    '____'

  const nc = t(nomenclaturaCatastral)
  const parcialTxt = parcial ? ' (parcial)' : ''
  const tipoTrabajo = t(tipoMensuraLabel).toLocaleUpperCase('es-AR')
  const domicilioParcelaTxt = t(domicilioParcela)
  const propietarioTxt = t(propietario)
  const inscripcionTxt = t(inscripcionDominio)
  const ordenanteNombre = t(ordenanteNombreCompleto)
  const ordenanteDoc = t(ordenanteDocumento)
  const ordenanteCuitTxt = t(ordenanteCuit)
  const ordenanteDomicilioTxt = t(ordenanteDomicilio)
  const ordenanteCaracterTxt = t(ordenanteCaracter)
  const planoAntecedenteTxt = t(planoAntecedente)
    ? `Corresponde al plano ${planoAntecedente} de la D.G.C.`
    : 'El profesional no observa la existencia de plano anterior registrado en la D.G.C.'
  const publicacionEdictoFechaTxt = t(publicacionEdictoFecha)
  const medioPublicacionTxt = t(medioPublicacion)
  const hasEdicto =
    llevPublicacionEdictos && medioPublicacionTxt.length > 0 && publicacionEdictoFechaTxt.length > 0
  const colindantesCardinalesTxt = formatCardinalesColindantes(
    colindantes.flatMap((c) => c.nomenclaturas.map((n) => n.rumbo))
  )
  const citacionColindantesTxt = colindantesCardinalesTxt
    ? ` a los colindantes por el ${colindantesCardinalesTxt}.`
    : '.'
  const publicidadColindantesTxt = colindantesCardinalesTxt
    ? ` y expresamente a los colindantes por el ${colindantesCardinalesTxt}`
    : ''
  const consultasLine = buildConsultasFooterText(principal)

  const children: (Paragraph | Table)[] = [
    pTitle('MEMORIA DE MENSURA'),
    pBodyRuns([
      runBody('• Trabajo de '),
      runBody(tipoTrabajo, { bold: true }),
      runBody(' de la parcela Nomenclatura Catastral '),
      runBody(`${nc}${parcialTxt}`, { bold: true }),
      runBody(
        ` ubicada sobre ${domicilioParcelaTxt}, registrada en la Dirección de Geodesia y Catastro, y en el Registro General Inmobiliario a nombre de ${propietarioTxt}, ${inscripcionTxt}; realizado el día ${fechaLarga} a las ${hora} horas.`
      ),
    ]),
    pBodyRuns([
      runBody(
        `• La presente mensura es ordenada por ${ordenanteNombre}, DNI ${ordenanteDoc}, CUIT/CUIL ${ordenanteCuitTxt}, con domicilio real en ${ordenanteDomicilioTxt}, en carácter de ${ordenanteCaracterTxt}.`
      ),
      runBody(planoAntecedenteTxt),
    ]),
    pBodyRuns([
      runBody('• Citación mediante cédula', { bold: true }),
      runBody(citacionColindantesTxt),
    ]),
    pBodyRuns([
      runBody('• Publicidad del acto de mensura:', { bold: true }),
      runBody(` se citó a propietarios, colindantes e interesados${publicidadColindantesTxt},`),
      runBody(
        hasEdicto
          ? `mediante edicto de ${medioPublicacionTxt} de fecha ${publicacionEdictoFechaTxt}.`
          : '.'
      ),
    ]),
    pBody(
      '• Se investiga sobre los antecedentes del inmueble, munidos de éstos en días previos al acto de mensura, se procede en primera instancia a realizar un reconocimiento, para constatar los hechos existentes; se plantea la metodología de relevamiento de los mismos.'
    ),
    pBody('• Se amojonó de acuerdo a reglamento.'),
    ...(memoriaObservaciones ? [pBodyRuns([runBody('• '), runBody(memoriaObservaciones)])] : []),
    pBlankLine(),
  ]

  children.push(pFechaRight(`San Juan, ${fechaLarga}.`))

  children.push(pBlankLine())
  children.push(buildFirmasTable({ ordenantes: [], principal, segundo }))
  if (consultasLine) {
    children.push(pBodyRuns([runBody(' '), new FootnoteReferenceRun(1)]))
  }

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

export async function handleMemoriaDescriptivaDownload(
  expedienteId: string,
  userId: string,
  _ctx?: DynamicDocxRenderContext
): Promise<NextResponse> {
  void _ctx
  const row = await prisma.expediente.findFirst({
    where: { id: expedienteId, accountOwnerId: userId },
    ...expedienteMemoriaDescriptivaFindArgs,
  })
  if (!row) return new NextResponse(null, { status: 404 })

  const payload = expedienteRowToMemoriaDescriptivaRenderData(row)
  const body = await renderMemoriaDescriptiva(payload)
  const meta = getExpedienteDownloadDocMeta('memoria-descriptiva')
  const filename = buildExpedienteDocxAttachmentFilename(meta, row.nomenclaturaCatastral)
  return new NextResponse(new Uint8Array(body), {
    status: 200,
    headers: {
      'Content-Type': EXPEDIENTE_DOCX_MIME,
      'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  })
}
