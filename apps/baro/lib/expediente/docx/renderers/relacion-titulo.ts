import { Document, Packer, type Paragraph, type Table } from 'docx'
import { NextResponse } from 'next/server'
import type { DynamicDocxRenderContext } from '../renderer-context'
import type { RelacionTituloRenderData } from '../document-render-data'
import {
  expedienteRelacionTituloFindArgs,
  expedienteRowToRelacionTituloRenderData,
} from '../document-render-data'
import { buildFirmasTable, pBlankLine, pBody, pBodyCenteredBold } from '../render-utils'
import { expedienteDocxStandardSectionPage } from '../word-page-layout'
import {
  EXPEDIENTE_DOCX_MIME,
  buildExpedienteDocxAttachmentFilename,
  getExpedienteDownloadDocMeta,
} from '@/lib/expediente/descarga'
import { prisma } from '@/lib/prisma'

export async function renderRelacionTitulo(data: RelacionTituloRenderData): Promise<Buffer> {
  const {
    principal,
    segundo,
    nomenclaturaCatastral,
    tipoMensuraLabel,
    propietario,
    inscripcionDominio,
    superficieTotal,
    superficieSegun,
    fechaRelacionTitulos,
    observacionesGenerales,
    puntos,
  } = data

  const children: (Paragraph | Table)[] = [
    pBodyCenteredBold('RELACIÓN DE TÍTULOS'),
    pBlankLine(),
    pBody(`Nomenclatura Catastral: ${nomenclaturaCatastral}`),
    ...(tipoMensuraLabel ? [pBody(`Tipo de Mensura: ${tipoMensuraLabel}`)] : []),
    ...(propietario ? [pBody(`Propietario: ${propietario}`)] : []),
    ...(inscripcionDominio ? [pBody(`Inscripción de Dominio: ${inscripcionDominio}`)] : []),
    ...(fechaRelacionTitulos ? [pBody(`Fecha: ${fechaRelacionTitulos}`)] : []),
    pBlankLine(),
  ]

  if (superficieTotal || superficieSegun) {
    children.push(pBodyCenteredBold('Superficies'))
    if (superficieTotal) children.push(pBody(`Superficie Total: ${superficieTotal}`))
    if (superficieSegun) children.push(pBody(`Según: ${superficieSegun}`))
    children.push(pBlankLine())
  }

  children.push(pBodyCenteredBold('Linderos'))
  if (puntos.length === 0) {
    children.push(pBody('(Sin linderos registrados)'))
  } else {
    for (const p of puntos) {
      const partes: string[] = [`${p.orden}. ${p.direccion}`]
      if (p.medida) partes.push(p.medida)
      if (p.descripcion) partes.push(p.descripcion)
      children.push(pBody(partes.join('  —  ')))
    }
  }
  children.push(pBlankLine())

  if (observacionesGenerales) {
    children.push(pBodyCenteredBold('Observaciones Generales'))
    for (const line of observacionesGenerales.split('\n')) {
      children.push(pBody(line.trim()))
    }
    children.push(pBlankLine())
  }

  children.push(pBlankLine())
  children.push(buildFirmasTable({ ordenantes: [], principal, segundo }))

  const doc = new Document({
    sections: [{ properties: { page: expedienteDocxStandardSectionPage() }, children }],
  })
  return Packer.toBuffer(doc)
}

export async function handleRelacionTituloDownload(
  expedienteId: string,
  userId: string,
  _ctx?: DynamicDocxRenderContext
): Promise<NextResponse> {
  void _ctx
  const row = await prisma.expediente.findFirst({
    where: { id: expedienteId, accountOwnerId: userId },
    ...expedienteRelacionTituloFindArgs,
  })
  if (!row) return new NextResponse(null, { status: 404 })

  const payload = expedienteRowToRelacionTituloRenderData(row)
  const body = await renderRelacionTitulo(payload)
  const meta = getExpedienteDownloadDocMeta('relacion-titulo')
  const filename = buildExpedienteDocxAttachmentFilename(meta, row.nomenclaturaCatastral)
  return new NextResponse(new Uint8Array(body), {
    status: 200,
    headers: {
      'Content-Type': EXPEDIENTE_DOCX_MIME,
      'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  })
}
