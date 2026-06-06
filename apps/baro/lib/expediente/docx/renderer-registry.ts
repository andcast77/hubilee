import type { NextResponse } from 'next/server'
import type { DynamicDocxRenderContext } from './renderer-context'
import type { ExpedienteDocxDocumentId } from './types'
import { handleOrdenTrabajoDownload } from './renderers/orden-trabajo'
import { handleActaDownload } from './renderers/acta'
import { handleEdictoDownload } from './renderers/edicto'
import { handleCitacionDownload } from './renderers/citacion'
import { handleMemoriaDescriptivaDownload } from './renderers/memoria-descriptiva'
import { handleNotaHidraulicaDownload } from './renderers/nota-hidraulica'
import { handleNotaFiscaliaDownload } from './renderers/nota-fiscalia'
import { handleRelacionTituloDownload } from './renderers/relacion-titulo'

export type { DynamicDocxRenderContext } from './renderer-context'

export type DynamicDocxRenderer = (
  expedienteId: string,
  userId: string,
  ctx?: DynamicDocxRenderContext
) => Promise<NextResponse>

export const DYNAMIC_RENDERERS: Partial<Record<ExpedienteDocxDocumentId, DynamicDocxRenderer>> = {
  acta: handleActaDownload,
  edicto: handleEdictoDownload,
  'citacion-colindantes': handleCitacionDownload,
  'relacion-titulo': handleRelacionTituloDownload,
  'memoria-descriptiva': handleMemoriaDescriptivaDownload,
  'nota-hidraulica': handleNotaHidraulicaDownload,
  'nota-fiscalia': handleNotaFiscaliaDownload,
  'orden-trabajo': handleOrdenTrabajoDownload,
}
