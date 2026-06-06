import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

/**
 * Returns a same-origin pathname safe to pass to `router.push` / `<Link href>`,
 * or null if `raw` is missing or looks like an open redirect (e.g. `//evil.com`).
 */
export function safeInternalPath(raw: string | null | undefined): string | null {
  if (!raw) return null

  try {
    const url = new URL(raw, 'http://local')
    if (url.origin !== 'http://local') return null
    return url.pathname + url.search + url.hash
  } catch {
    return null
  }
}

type RateEntry = { count: number; windowStart: number }

const rateStore = new Map<string, RateEntry>()

function rateWindowMs(): number {
  const n = Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS)
  return Number.isFinite(n) && n > 0 ? n : 60_000
}

function rateMaxRequests(): number {
  const n = Number(process.env.AUTH_RATE_LIMIT_MAX)
  return Number.isFinite(n) && n > 0 ? n : 30
}

/** Fixed window per key. Not suitable for multi-instance production without shared store. */
export function rateLimitHit(key: string): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now()
  const win = rateWindowMs()
  const max = rateMaxRequests()
  let e = rateStore.get(key)
  if (!e || now - e.windowStart >= win) {
    e = { count: 1, windowStart: now }
    rateStore.set(key, e)
    return { ok: true }
  }
  e.count += 1
  if (e.count > max) {
    const retryAfterSec = Math.ceil((e.windowStart + win - now) / 1000)
    return { ok: false, retryAfterSec: Math.max(1, retryAfterSec) }
  }
  return { ok: true }
}

export function clientIp(request: Request): string {
  const xf = request.headers.get('x-forwarded-for')
  if (xf) {
    const first = xf.split(',')[0]?.trim()
    if (first) return first
  }
  return 'unknown'
}

function allowedOriginsList(): string[] {
  const raw = process.env.AUTH_ALLOWED_ORIGINS
  if (!raw?.trim()) return []
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

/** Returns origin string to reflect, or null if CORS should not allow the request. */
export function getAllowedOrigin(request: NextRequest): string | null {
  const origin = request.headers.get('origin')
  if (!origin) return null
  const allowed = allowedOriginsList()
  if (allowed.length === 0) return null
  return allowed.includes(origin) ? origin : null
}

export function applyCorsHeaders(request: NextRequest, headers: Headers): Headers {
  const allow = getAllowedOrigin(request)
  if (allow) {
    headers.set('Access-Control-Allow-Origin', allow)
    headers.set('Access-Control-Allow-Credentials', 'true')
    headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    headers.set('Access-Control-Max-Age', '86400')
  }
  return headers
}

export function corsPreflightResponse(request: NextRequest): Response | null {
  const allow = getAllowedOrigin(request)
  if (!allow) return null
  const headers = new Headers()
  headers.set('Access-Control-Allow-Origin', allow)
  headers.set('Access-Control-Allow-Credentials', 'true')
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  headers.set('Access-Control-Max-Age', '86400')
  return new Response(null, { status: 204, headers })
}

export function jsonWithCors(
  request: NextRequest,
  body: unknown,
  init: { status: number; headers?: HeadersInit }
): NextResponse {
  let serialized: string
  try {
    serialized = typeof body === 'string' ? body : JSON.stringify(body)
  } catch {
    serialized = JSON.stringify({
      error: 'server_error',
      message: 'No pudimos formatear la respuesta del servidor.',
    })
  }
  const headers = new Headers(init.headers as HeadersInit | undefined)
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json; charset=utf-8')
  }
  const res = new NextResponse(serialized, { status: init.status, headers })
  applyCorsHeaders(request, res.headers)
  return res
}
