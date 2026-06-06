import { Document, Packer, type Paragraph, type Table } from 'docx'

import { NextResponse } from 'next/server'

import type { DynamicDocxRenderContext } from '../renderer-context'
import type { ActaRenderData } from '../document-render-data'

import { expedienteActaFindArgs, expedienteRowToActaRenderData } from '../document-render-data'

import { pBody, pBodyKeepNext, pBodyRuns, pTitle, runBody } from '../render-utils'

import { expedienteDocxStandardSectionPage } from '../word-page-layout'

import {
  EXPEDIENTE_DOCX_MIME,
  buildExpedienteDocxAttachmentFilename,
  getExpedienteDownloadDocMeta,
} from '@/lib/expediente/descarga'

import { parseActaNotarialFechaToDate } from '@/lib/expediente/acta-notarial-fecha'
import { departamentoNombreFromNomenclaturaCatastral } from '@/lib/format'

import { prisma } from '@/lib/prisma'

const COSTADOS = ['Norte', 'Sur', 'Este', 'Oeste'] as const

const DEPTO_PLACEHOLDER = '____________'

const CALLE_PLACEHOLDER = '________________'

/** Rayas cuando no hay fecha/hora de acta cargada o no es parseable (campo «Fecha de acta»). */

const HORA_RAYA = '__________'

const FECHA_RAYA = '________________________________'

/** Texto de la Res. 449-DGC-08 (`context/Acta_Mensura.pdf`). */

const PARRAFO_RESOLUCION_449_INTRO =
  'Se deja aclarado que según lo dispone la resolución 449-DGC-08 que: "'

const PARRAFO_RESOLUCION_449_CITA =
  'En caso de disenso se deja constancia de su disconformidad en el plano de mensura o se suspende el trámite administrativo de la mensura, para este supuesto deberá presentar por escrito en la dirección de Geodesia y Catastro la petición correspondiente dentro del término de 15 días hábiles a contar del día siguiente de la presente acta, asumiendo la responsabilidad que pueda ocasionar tal petición'

const PARRAFO_RESOLUCION_449_CIERRE = '".'

function t(s: string | null | undefined): string {
  return (s ?? '').trim()
}

/** Hora y fecha desde `actaNotarialFecha` (dd/mm/aaaa hh:mm o legacy ISO). */
function horaYFechaDesdeActa(actaNotarialFecha: string): { horas: string; fechaLarga: string } {
  const raw = t(actaNotarialFecha)

  if (!raw) {
    return { horas: HORA_RAYA, fechaLarga: FECHA_RAYA }
  }

  const d = parseActaNotarialFechaToDate(raw)

  if (!d) {
    return { horas: HORA_RAYA, fechaLarga: FECHA_RAYA }
  }

  return {
    horas: d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }),

    fechaLarga: d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }),
  }
}

function costadoPlantilla(costado: (typeof COSTADOS)[number]): [Paragraph] {
  return [
    pBody(
      `Costado ${costado}, en ___________________ línea, ______________ ______________________________________________________________`
    ),
  ]
}

function verticesPlantilla(): Paragraph[] {
  return [
    pBodyKeepNext('Se encuentran materializados sus vértices de la siguiente manera:'),

    pBody(
      'Vértices: ______________________________________________ ______________________________________________________________'
    ),
  ]
}

function witnessParagraphTemplate(): Paragraph {
  return pBody(
    'El señor/a ____________________________________________ documento de identidad ______________ en calidad de _________________'
  )
}

export async function renderActa(data: ActaRenderData): Promise<Buffer> {
  const {
    nomenclaturaCatastral,

    domicilioParcela,

    tipoMensuraLabel,

    propietario,

    inscripcionDominio,

    actaNotarialFecha,

    lugarReunion,

    parcial,
  } = data

  const { horas, fechaLarga } = horaYFechaDesdeActa(actaNotarialFecha)

  const lugarCita = t(lugarReunion) || CALLE_PLACEHOLDER

  const departamento =
    departamentoNombreFromNomenclaturaCatastral(nomenclaturaCatastral) || DEPTO_PLACEHOLDER

  const baseLugar =
    'nos hacemos presentes en el lugar de reunión pactado en edicto, citaciones de colindantes, cito en'

  const tipoTrabajo = t(tipoMensuraLabel).toLocaleUpperCase('es-AR') || 'MENSURA'

  const nomenclaturaDisplay = nomenclaturaCatastral.trim().toLocaleUpperCase('es-AR')

  const calleUbicacion = t(domicilioParcela) || CALLE_PLACEHOLDER

  const insc = t(inscripcionDominio)

  const inscFrase = insc ? `al ${insc}` : 'sin inscripción dominial registrada'

  const prop = t(propietario) || '________________'

  const parrafosTestigos: Paragraph[] = [witnessParagraphTemplate(), witnessParagraphTemplate()]

  const children: (Paragraph | Table)[] = [
    pTitle('ACTA DE MENSURA Y AMOJONAMIENTO'),
    pBodyRuns([
      runBody('En el Departamento '),
      runBody(departamento.toLocaleUpperCase('es-AR'), { bold: true }),
      runBody(
        `, Provincia de San Juan, siendo las ${horas} horas del día ${fechaLarga}, ${baseLugar} ${lugarCita}, a los fines de realizar la `
      ),
      runBody(tipoTrabajo, { bold: true }),
      runBody(' de la parcela Nomenclatura Catastral '),
      runBody(nomenclaturaDisplay, { bold: true }),
      ...(parcial ? [runBody(' (PARCIAL)', { bold: true })] : []),
      runBody(
        `, ubicada en calle ${calleUbicacion}, registrada en la Dirección de Geodesia y Catastro; y en el Registro General Inmobiliario a nombre de ${prop}, ${inscFrase}. El amojonamiento se realizó conforme a reglamento materializándose los vértices de la siguiente manera y se encontraban presentes durante el acto:`
      ),
    ]),
  ]

  children.push(...parrafosTestigos)

  children.push(
    pBody(
      'Iniciadas las operaciones, en presencia de las personas mencionadas, se verificó que la parcela se encuentra deslindada de la manera que se indica:'
    )
  )

  for (const costado of COSTADOS) {
    const a = costadoPlantilla(costado)

    children.push(...a)
  }

  children.push(...verticesPlantilla())

  children.push(
    pBody(
      'Observaciones: ________________________________________ ______________________________________________________________'
    )
  )

  children.push(
    pBodyRuns([
      runBody(PARRAFO_RESOLUCION_449_INTRO),
      runBody(PARRAFO_RESOLUCION_449_CITA, { bold: true }),
      runBody(PARRAFO_RESOLUCION_449_CIERRE),
    ])
  )

  children.push(
    pBody(
      `Siendo las ${horas} horas, del día de la fecha, se dan por finalizadas las operaciones de amojonamiento y deslinde, cerrándose la presente acta, la que leída y ratificada, es firmada por el profesional actuante y los testigos presentes.`
    )
  )

  const doc = new Document({
    sections: [{ properties: { page: expedienteDocxStandardSectionPage() }, children }],
  })

  return Packer.toBuffer(doc)
}

export async function handleActaDownload(
  expedienteId: string,
  userId: string,
  _ctx?: DynamicDocxRenderContext
): Promise<NextResponse> {
  void _ctx
  const row = await prisma.expediente.findFirst({
    where: { id: expedienteId, accountOwnerId: userId },
    ...expedienteActaFindArgs,
  })

  if (!row) {
    console.warn('[acta-renderer] 404 expediente-not-found-for-user', {
      expedienteId,
      userId,
    })
    return new NextResponse(null, { status: 404 })
  }

  const payload = expedienteRowToActaRenderData(row)

  const body = await renderActa(payload)

  const meta = getExpedienteDownloadDocMeta('acta')

  const filename = buildExpedienteDocxAttachmentFilename(meta, row.nomenclaturaCatastral)

  return new NextResponse(new Uint8Array(body), {
    status: 200,

    headers: {
      'Content-Type': EXPEDIENTE_DOCX_MIME,

      'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  })
}
