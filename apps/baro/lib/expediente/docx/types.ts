/**
 * Contratos del pipeline DOCX del expediente (definiciones, render, datos canónicos).
 */

export const EXPEDIENTE_DOCX_DOCUMENT_IDS = [
  'acta',
  'edicto',
  'citacion-colindantes',
  'relacion-titulo',
  'memoria-descriptiva',
  'nota-hidraulica',
  'nota-fiscalia',
  'orden-trabajo',
] as const

export type ExpedienteDocxDocumentId = (typeof EXPEDIENTE_DOCX_DOCUMENT_IDS)[number]

export type ExpedienteDocxFieldCriticality = 'critical' | 'non_critical'

export type ExpedienteDocxFieldRequirement = {
  path: string
  criticality: ExpedienteDocxFieldCriticality
}

export type ExpedienteDocxDocumentDefinition = {
  id: ExpedienteDocxDocumentId
  label: string
  /** Clave estable para manifiesto / métricas (hoy = id). */
  templateKey: string
  /** Generación dinámica (ej. orden de trabajo con `docx`), sin archivo estático. */
  dynamic?: boolean
  /** Variable de entorno para rollout dinámico por documento; ausente = sin flag dedicado. */
  featureFlag?: string
  requiredFields: ExpedienteDocxFieldRequirement[]
  /** Archivo estático bajo `context/`; ausente si `dynamic === true`. */
  staticTemplateFileName?: string
  attachmentBasePrefix: string
}

export type ExpedienteDocxRenderErrorCode =
  | 'documento_no_soportado'
  | 'datos_faltantes'
  | 'plantilla_faltante'
  | 'acceso_no_autorizado'

export type ExpedienteDocxRenderError = {
  code: ExpedienteDocxRenderErrorCode
  message: string
  details?: unknown
}

export type ExpedienteDocxRenderResult = {
  buffer: Buffer
  filename: string
  templateVersion: string
  warnings: string[]
}

/** Snapshot estable hacia normalización Prisma → vista plantilla. */
export type ExpedienteDocxCanonicalData = {
  datos: Record<string, unknown>
  publicacion: Record<string, unknown>
  colindantes: unknown[]
  ordenantes: unknown[]
  linderos: Record<string, unknown>
  titulosLegacy: unknown[]
  firmas: unknown[]
}

export type TemplateGovernanceManifest = {
  templateKey: string
  activeVersion: string
  checksumSha256?: string
  schemaVersion: number
  releasedAt: string
  rollbackTo: string | null
  templateFileRelativeToContext: string
}
