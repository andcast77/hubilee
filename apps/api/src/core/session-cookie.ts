import type { FastifyReply } from 'fastify'
import type { ServerResponse } from 'http'
import type { AppConfig } from './config.js'

function appendSetCookie(reply: FastifyReply, value: string): void {
  ;(reply.raw as ServerResponse).appendHeader('Set-Cookie', value)
}

/** HttpOnly session cookie on the API host (Plan 1 / ADR-auth-token-storage). */
export const AUTH_SESSION_COOKIE = 'ms_session'

/** Opaque refresh token (PLAN-26); paired with short-lived access JWT in ms_session. */
export const AUTH_REFRESH_COOKIE = 'ms_refresh'

/**
 * Parse JWT expiry like 7d, 24h, 3600 (seconds if plain number).
 */
export function jwtExpiresInToMaxAgeSeconds(expiresIn: string): number {
  const s = expiresIn.trim()
  const m = s.match(/^(\d+)\s*([dhms])?$/i)
  if (!m) {
    const n = parseInt(s, 10)
    return Number.isFinite(n) && n > 0 ? n : 7 * 24 * 60 * 60
  }
  const num = parseInt(m[1], 10)
  const u = (m[2] || 's').toLowerCase()
  if (u === 'd') return num * 24 * 60 * 60
  if (u === 'h') return num * 60 * 60
  if (u === 'm') return num * 60
  return num
}

export function attachAuthSessionCookie(reply: FastifyReply, token: string, config: AppConfig): void {
  const maxAge = jwtExpiresInToMaxAgeSeconds(config.JWT_ACCESS_EXPIRES_IN)
  appendSetCookie(reply, cookieSegments(AUTH_SESSION_COOKIE, token, maxAge, config))
}

function cookieSegments(name: string, value: string, maxAge: number, config: AppConfig): string {
  const insecureDev =
    config.NODE_ENV !== 'production' && !process.env.VERCEL
  const segments = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    `Max-Age=${maxAge}`,
    insecureDev ? 'SameSite=Lax' : 'SameSite=None',
  ]
  if (!insecureDev) segments.push('Secure')
  return segments.join('; ')
}

/** Clear httpOnly session on the API host. */
export function clearAuthSessionCookie(reply: FastifyReply, config: AppConfig): void {
  const insecureDev =
    config.NODE_ENV !== 'production' && !process.env.VERCEL
  const base = ['Path=/', 'HttpOnly', 'Max-Age=0', insecureDev ? 'SameSite=Lax' : 'SameSite=None']
  if (!insecureDev) base.push('Secure')
  appendSetCookie(reply, `${AUTH_SESSION_COOKIE}=; ${base.join('; ')}`)
}

export function attachRefreshSessionCookie(reply: FastifyReply, refreshPlain: string, config: AppConfig): void {
  const maxAge = jwtExpiresInToMaxAgeSeconds(config.REFRESH_TOKEN_EXPIRES_IN)
  appendSetCookie(reply, cookieSegments(AUTH_REFRESH_COOKIE, refreshPlain, maxAge, config))
}

export function clearRefreshSessionCookie(reply: FastifyReply, config: AppConfig): void {
  const insecureDev =
    config.NODE_ENV !== 'production' && !process.env.VERCEL
  const base = ['Path=/', 'HttpOnly', 'Max-Age=0', insecureDev ? 'SameSite=Lax' : 'SameSite=None']
  if (!insecureDev) base.push('Secure')
  appendSetCookie(reply, `${AUTH_REFRESH_COOKIE}=; ${base.join('; ')}`)
}

export function clearAllAuthCookies(reply: FastifyReply, config: AppConfig): void {
  clearAuthSessionCookie(reply, config)
  clearRefreshSessionCookie(reply, config)
}

/** Read raw refresh token from httpOnly cookie (if present). */
export function getRefreshTokenFromCookieHeader(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null
  const prefix = `${AUTH_REFRESH_COOKIE}=`
  for (const part of cookieHeader.split(';')) {
    const p = part.trim()
    if (p.startsWith(prefix)) {
      try {
        return decodeURIComponent(p.slice(prefix.length))
      } catch {
        return p.slice(prefix.length)
      }
    }
  }
  return null
}
