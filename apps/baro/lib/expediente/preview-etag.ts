import 'server-only'

import { createHash } from 'node:crypto'

/**
 * Bump cuando cambie la lógica de render DOCX sin que `expediente.updatedAt` refleje el cambio
 * (p. ej. solo código). Opcional: `EXPEDIENTE_PREVIEW_ETAG_REVISION` en el entorno.
 */
export const EXPEDIENTE_PREVIEW_ETAG_REVISION =
  process.env.EXPEDIENTE_PREVIEW_ETAG_REVISION?.trim() || '1'

export type ExpedientePreviewEtagInput = {
  expedienteId: string
  docTipo: string
  expedienteUpdatedAt: Date
  /** Solo plantillas estáticas: mtime del archivo en disco */
  staticTemplateMtimeMs?: number | null
  /**
   * Variante de generación (p. ej. query params en documentos dinámicos).
   * Debe ser estable para el mismo recurso lógico.
   */
  dynamicVariant?: string
}

/**
 * ETag fuerte derivado de identidad del expediente + tipo de documento + revisión.
 * No hashea el cuerpo: permite 304 sin regenerar el .docx.
 */
export function buildExpedienteDocxPreviewEtag(input: ExpedientePreviewEtagInput): string {
  const mtime =
    input.staticTemplateMtimeMs != null && Number.isFinite(input.staticTemplateMtimeMs)
      ? String(input.staticTemplateMtimeMs)
      : ''
  const payload = [
    EXPEDIENTE_PREVIEW_ETAG_REVISION,
    input.expedienteId,
    input.docTipo,
    input.expedienteUpdatedAt.toISOString(),
    mtime,
    input.dynamicVariant?.trim() ?? '',
  ].join('\0')
  const hex = createHash('sha256').update(payload, 'utf8').digest('hex')
  return `"${hex}"`
}

/**
 * Comparación laxa con If-None-Match (incluye listas y ETags débiles W/).
 */
export function previewEtagMatchesIfNoneMatch(
  ifNoneMatch: string | null | undefined,
  etag: string
): boolean {
  if (!ifNoneMatch?.trim()) return false
  const normalizedEtag = normalizePreviewEtagToken(etag)
  for (const raw of ifNoneMatch.split(',')) {
    const part = raw.trim()
    if (part === '*') return true
    if (normalizePreviewEtagToken(part) === normalizedEtag) return true
  }
  return false
}

function normalizePreviewEtagToken(raw: string): string {
  let s = raw.trim()
  if (s.startsWith('W/')) s = s.slice(2).trim()
  if (s.startsWith('"') && s.endsWith('"') && s.length >= 2) s = s.slice(1, -1)
  return s
}

const PREVIEW_ETAG_QUERY_SKIP = new Set(['preview', 'format'])

/**
 * Clave estable para variantes de documentos dinámicos (query string sin `preview`/`format`).
 */
export function buildExpedienteDocxDynamicVariant(searchParams: URLSearchParams): string {
  const keys = [...new Set(searchParams.keys())]
    .filter((k) => !PREVIEW_ETAG_QUERY_SKIP.has(k))
    .sort()
  return keys
    .map((k) => {
      const vals = [
        ...new Set(
          searchParams
            .getAll(k)
            .map((v) => v.trim())
            .filter(Boolean)
        ),
      ].sort()
      return `${k}=${vals.join('|')}`
    })
    .join('&')
}
