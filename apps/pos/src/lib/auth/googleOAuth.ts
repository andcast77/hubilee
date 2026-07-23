import { API_URL } from '@/lib/api/client'

/** Same-origin path only (reject protocol-relative / absolute URLs). */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw || !raw.startsWith('/')) return null
  if (raw.startsWith('//')) return null
  return raw
}

/**
 * Navigate the browser to API Google OAuth start.
 * Pos origin must be listed in API `CORS_ORIGIN`.
 */
export function startGoogleOAuth(params: {
  intent: 'login' | 'register'
  next?: string | null
}): void {
  const returnOrigin = window.location.origin
  const url = new URL('/v1/auth/google', API_URL.replace(/\/$/, '') + '/')
  url.searchParams.set('returnOrigin', returnOrigin)
  url.searchParams.set('intent', params.intent)
  const next = safeNextPath(params.next ?? null)
  if (next) url.searchParams.set('next', next)
  window.location.assign(url.toString())
}
