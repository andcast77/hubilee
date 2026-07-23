import type { ServerResponse } from 'http'
import { BadRequestError } from '../common/errors/app-error.js'
import { getConfig } from './config.js'

/**
 * Mirrors @fastify/cors behavior for hijacked/raw responses: reflect allowed Origin
 * and set Access-Control-Allow-Credentials (required for credentialed browser requests).
 */
export function parseCorsOriginList(corsOrigin: string): string[] {
  return corsOrigin
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
}

/**
 * Fail-closed origin check for OAuth returnOrigin (and similar redirects).
 * Reuses CORS_ORIGIN allowlist — same source as registration verification base URL.
 */
export function assertAllowlistedOrigin(returnOrigin: string): string {
  const raw = returnOrigin.trim()
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    throw new BadRequestError('Origen de retorno inválido', 'RETURN_ORIGIN_INVALID')
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new BadRequestError('Origen de retorno inválido', 'RETURN_ORIGIN_INVALID')
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new BadRequestError('Origen de retorno inválido', 'RETURN_ORIGIN_INVALID')
  }
  const origin = `${parsed.protocol}//${parsed.host}`.replace(/\/$/, '')
  const allowed = parseCorsOriginList(getConfig().CORS_ORIGIN)
  if (!allowed.includes(origin)) {
    throw new BadRequestError('Origen de retorno no permitido', 'RETURN_ORIGIN_NOT_ALLOWED')
  }
  return origin
}

export function reflectAllowedOrigin(
  originHeader: string | undefined,
  allowedOrigins: string[],
): string | null {
  if (!originHeader) return null
  return allowedOrigins.includes(originHeader) ? originHeader : null
}

export function applyCorsHeadersToRawResponse(
  raw: ServerResponse,
  originHeader: string | undefined,
  allowedOrigins: string[],
): void {
  const origin = reflectAllowedOrigin(originHeader, allowedOrigins)
  if (!origin) return
  raw.setHeader('Access-Control-Allow-Origin', origin)
  raw.setHeader('Access-Control-Allow-Credentials', 'true')
  raw.setHeader('Vary', 'Origin')
}
