import 'server-only'

import path from 'node:path'
import { NextResponse } from 'next/server'

import {
  EXPEDIENTE_DOCX_MIME,
  expedienteDownloadDocCatalog,
  type ExpedienteDownloadDocMeta,
  type ExpedienteDownloadDocType,
} from '@/lib/expediente/descarga-catalog'

import { EXPEDIENTE_DOCX_DOCUMENT_IDS } from '@/lib/expediente/docx/types'

/**
 * Descarga / generación de .docx del expediente (`context/` plantillas estáticas, MVP).
 * Usa filesystem, manifest y rutas HTTP: este módulo es **solo servidor**.
 *
 * Para listas/tags en cliente: importá `@/lib/expediente/descarga-catalog`.
 */

export { expedienteDownloadDocCatalog }
export type { ExpedienteDownloadDocMeta, ExpedienteDownloadDocType }

export { EXPEDIENTE_DOCX_DOCUMENT_IDS }
export type { ExpedienteDocxDocumentId } from '@/lib/expediente/docx/types'
export {
  getExpedienteDocxDocumentDefinition,
  listExpedienteDocxDocumentDefinitions,
  parseExpedienteDocxDocumentDefinition,
  requireExpedienteDocxDocumentDefinition,
} from '@/lib/expediente/docx/definitions'
export { ExpedienteDocxError, mapExpedienteDocxErrorToHttp } from '@/lib/expediente/docx/errors'
export {
  loadTemplateGovernanceManifest,
  parseTemplateGovernanceManifestJson,
  sha256Hex,
} from '@/lib/expediente/docx/manifest'
export type {
  ExpedienteDocxCanonicalData,
  ExpedienteDocxRenderResult,
} from '@/lib/expediente/docx/types'

export { EXPEDIENTE_DOCX_MIME }

export const EXPEDIENTE_DOWNLOAD_DOC_TYPES = EXPEDIENTE_DOCX_DOCUMENT_IDS

const DOC_TYPE_SET = new Set<string>(EXPEDIENTE_DOWNLOAD_DOC_TYPES)

const META_BY_ID = Object.fromEntries(
  expedienteDownloadDocCatalog.map((m) => [m.id, m])
) as Readonly<Record<ExpedienteDownloadDocType, ExpedienteDownloadDocMeta>>

export function parseExpedienteDownloadDocType(raw: string): ExpedienteDownloadDocType | null {
  if (DOC_TYPE_SET.has(raw)) {
    return raw as ExpedienteDownloadDocType
  }
  return null
}

export function getExpedienteDownloadDocMeta(
  id: ExpedienteDownloadDocType
): ExpedienteDownloadDocMeta {
  return META_BY_ID[id]
}

/** Caracteres problemáticos en nombres de archivo (Windows / sane defaults). */
export function sanitizeExpedienteNomenclaturaForFilename(nomenclatura: string): string {
  const trimmed = nomenclatura.trim()
  const replaced = trimmed
    .replace(/\//g, '_')
    .replace(/[<>:"\\|?*\u0000-\u001f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return replaced.length > 0 ? replaced : 'sin-nomenclatura'
}

export function buildExpedienteDocxAttachmentFilename(
  meta: ExpedienteDownloadDocMeta,
  nomenclaturaCatastral: string
): string {
  return buildExpedienteAttachmentFilename(meta, nomenclaturaCatastral)
}

/**
 * Construye el nombre de archivo `.docx` (`${prefix}_${nomenclaturaSegura}.docx`).
 */
export function buildExpedienteAttachmentFilename(
  meta: ExpedienteDownloadDocMeta,
  nomenclaturaCatastral: string
): string {
  const safe = sanitizeExpedienteNomenclaturaForFilename(nomenclaturaCatastral)
  return `${meta.attachmentBasePrefix}_${safe}.docx`
}

/**
 * Variante para flujos sin nomenclatura (formularios en blanco).
 */
export function buildExpedienteFormularioAttachmentBase(meta: ExpedienteDownloadDocMeta): string {
  return sanitizeExpedienteNomenclaturaForFilename(`${meta.attachmentBasePrefix}_Formulario`)
}

export function resolveExpedienteDocTemplateAbsolutePath(templateFileName: string): string {
  return path.join(process.cwd(), 'context', templateFileName)
}

/**
 * When `preview=1` is used, serve the same bytes with `Content-Disposition: inline` so tab/open
 * semantics match “view”; `fetch()` in the preview dialog works either way.
 */
export function withExpedienteDocxPreviewDisposition(
  response: NextResponse,
  preview: boolean
): NextResponse {
  if (!preview || response.status !== 200) {
    return response
  }
  const headers = new Headers(response.headers)
  const cd = headers.get('Content-Disposition')
  if (cd?.startsWith('attachment')) {
    headers.set('Content-Disposition', cd.replace(/^attachment/, 'inline'))
  }
  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

/** ETag + política de caché privada para vista previa / revalidación en cliente. */
export function withExpedienteDocxPreviewCacheHeaders(
  response: NextResponse,
  etag: string
): NextResponse {
  const headers = new Headers(response.headers)
  headers.set('ETag', etag)
  headers.set('Cache-Control', 'private, no-cache')
  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
