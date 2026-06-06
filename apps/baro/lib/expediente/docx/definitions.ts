import { ExpedienteDocxError } from '@/lib/expediente/docx/errors'
import type {
  ExpedienteDocxDocumentDefinition,
  ExpedienteDocxDocumentId,
} from '@/lib/expediente/docx/types'

const DEFINITIONS: readonly ExpedienteDocxDocumentDefinition[] = [
  {
    id: 'acta',
    label: 'Acta de mensura',
    templateKey: 'acta',
    dynamic: true,
    attachmentBasePrefix: 'ActaMensura',
    requiredFields: [
      { path: 'datos.nomenclaturaCatastral', criticality: 'critical' },
      { path: 'datos.actaNotarialFecha', criticality: 'non_critical' },
    ],
  },
  {
    id: 'edicto',
    label: 'Edicto',
    templateKey: 'edicto',
    dynamic: true,
    attachmentBasePrefix: 'Edicto',
    requiredFields: [
      { path: 'datos.nomenclaturaCatastral', criticality: 'critical' },
      { path: 'datos.medioPublicacion', criticality: 'critical' },
      { path: 'datos.publicacionEdictoFecha', criticality: 'critical' },
    ],
  },
  {
    id: 'citacion-colindantes',
    label: 'Comunicación de mensura (colindantes)',
    templateKey: 'citacion-colindantes',
    dynamic: true,
    attachmentBasePrefix: 'CitacionColindantesCompleta',
    requiredFields: [
      { path: 'datos.nomenclaturaCatastral', criticality: 'critical' },
      { path: 'colindantes', criticality: 'non_critical' },
    ],
  },
  {
    id: 'relacion-titulo',
    label: 'Relación de título',
    templateKey: 'relacion-titulo',
    dynamic: true,
    attachmentBasePrefix: 'RelacionTitulos',
    requiredFields: [
      { path: 'datos.nomenclaturaCatastral', criticality: 'critical' },
      { path: 'linderos.puntos', criticality: 'non_critical' },
    ],
  },
  {
    id: 'memoria-descriptiva',
    label: 'Memoria descriptiva',
    templateKey: 'memoria-descriptiva',
    dynamic: true,
    attachmentBasePrefix: 'MemoriaDescriptiva',
    requiredFields: [
      { path: 'datos.nomenclaturaCatastral', criticality: 'critical' },
      { path: 'datos.memoriaObservaciones', criticality: 'non_critical' },
    ],
  },
  {
    id: 'nota-hidraulica',
    label: 'Nota hidráulica',
    templateKey: 'nota-hidraulica',
    dynamic: true,
    attachmentBasePrefix: 'NotaHidraulica',
    requiredFields: [
      { path: 'datos.nomenclaturaCatastral', criticality: 'critical' },
      { path: 'datos.motivoHidraulica', criticality: 'non_critical' },
    ],
  },
  {
    id: 'nota-fiscalia',
    label: 'Nota fiscalía',
    templateKey: 'nota-fiscalia',
    dynamic: true,
    attachmentBasePrefix: 'NotaFiscalia',
    requiredFields: [
      { path: 'datos.nomenclaturaCatastral', criticality: 'critical' },
      { path: 'datos.motivoFiscalia', criticality: 'non_critical' },
    ],
  },
  {
    id: 'orden-trabajo',
    label: 'Orden de trabajo',
    templateKey: 'orden-trabajo',
    dynamic: true,
    attachmentBasePrefix: 'OrdenDeTrabajo',
    requiredFields: [
      { path: 'datos.fechaOrdenTrabajo', criticality: 'non_critical' },
      { path: 'datos.soloOrdenTrabajo', criticality: 'critical' },
    ],
  },
]

const BY_ID = Object.fromEntries(DEFINITIONS.map((d) => [d.id, d])) as Readonly<
  Record<ExpedienteDocxDocumentId, ExpedienteDocxDocumentDefinition>
>

export function parseExpedienteDocxDocumentDefinition(
  raw: string
): ExpedienteDocxDocumentDefinition | null {
  const hit = BY_ID[raw as ExpedienteDocxDocumentId]
  return hit ?? null
}

export function listExpedienteDocxDocumentDefinitions(): readonly ExpedienteDocxDocumentDefinition[] {
  return DEFINITIONS
}

export function getExpedienteDocxDocumentDefinition(
  id: ExpedienteDocxDocumentId
): ExpedienteDocxDocumentDefinition {
  return BY_ID[id]
}

/** @throws {ExpedienteDocxError} documento_no_soportado */
export function requireExpedienteDocxDocumentDefinition(
  raw: string
): ExpedienteDocxDocumentDefinition {
  const hit = BY_ID[raw as ExpedienteDocxDocumentId]
  if (!hit) {
    throw new ExpedienteDocxError(
      'documento_no_soportado',
      `Tipo de documento no soportado: ${raw}`
    )
  }
  return hit
}
