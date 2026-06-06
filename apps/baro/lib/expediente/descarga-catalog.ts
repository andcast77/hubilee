import { listExpedienteDocxDocumentDefinitions } from '@/lib/expediente/docx/definitions'
import type { ExpedienteDocxDocumentId } from '@/lib/expediente/docx/types'

/**
 * Catálogo de documentos descargables (derivado del registry DOCX).
 * Sin `node:*` ni `manifest`: seguro para importar desde componentes `"use client"`.
 */

export const EXPEDIENTE_DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document' as const

export type ExpedienteDownloadDocType = ExpedienteDocxDocumentId

export type ExpedienteDownloadDocMeta = {
  id: ExpedienteDownloadDocType
  label: string
  /** Plantilla estática bajo `context/`; viene del registry DOCX (no entrada de usuario). */
  templateFileName: string
  attachmentBasePrefix: string
}

export const expedienteDownloadDocCatalog: readonly ExpedienteDownloadDocMeta[] =
  listExpedienteDocxDocumentDefinitions().map((d) => ({
    id: d.id,
    label: d.label,
    templateFileName: d.staticTemplateFileName ?? '',
    attachmentBasePrefix: d.attachmentBasePrefix,
  }))
