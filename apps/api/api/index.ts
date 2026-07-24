/**
 * Vercel serverless handler: forwards all requests to the Fastify app via inject.
 * Rewrite "/(.*)" -> "/api" in vercel.json so this handler receives every request.
 */

import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { pathToFileURL } from 'url'
import { fileURLToPath } from 'url'

// Prevent unhandled rejections/uncaught errors from crashing the function (e.g. from loaded server or deps)
if (typeof process !== 'undefined') {
  process.on('unhandledRejection', (reason, promise) => {
    console.error('[api] unhandledRejection', reason)
  })
  process.on('uncaughtException', (err) => {
    console.error('[api] uncaughtException', err)
  })
}

const __dirname = dirname(fileURLToPath(import.meta.url))

/** HTTP method union expected by Fastify inject (request.method is string) */
type HTTPMethods = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'

/** Shape of the object returned by Fastify inject() when called with options (not chain) */
interface InjectResponse {
  statusCode: number
  headers: Record<string, string | string[] | undefined>
  body: string | Buffer | null
}

/** Fastify inject puede devolver `Buffer`; `Response` (tipos DOM) no acepta `Buffer` como `BodyInit`. */
function injectBodyToBodyInit(body: string | Buffer | null | undefined): BodyInit | undefined {
  if (body == null) return undefined
  if (typeof body === 'string') return body
  return new Uint8Array(body)
}

/** Web Fetch API Request shape used by Vercel's default handler signature */
interface FetchRequest {
  url: string
  method: string
  headers: {
    entries(): IterableIterator<[string, string]>
  }
  text(): Promise<string>
}

let appPromise: Promise<import('fastify').FastifyInstance> | null = null

function resolveServerPath(): string {
  // Prefer paths relative to this handler (apps/api/api → apps/api/dist).
  // Fallbacks cover Root Directory = apps/api (cwd=…) and monorepo root (cwd=/var/task).
  const candidates = [
    join(__dirname, '..', 'dist', 'server.js'),
    join(process.cwd(), 'dist', 'server.js'),
    join(process.cwd(), 'apps', 'api', 'dist', 'server.js'),
  ]
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }
  throw new Error(
    `API server bundle not found. Tried: ${candidates.join(' | ')}. ` +
      'Ensure turbo build emits apps/api/dist and vercel.json includeFiles covers dist/**.',
  )
}

function loadServer(serverPath: string): Promise<import('fastify').FastifyInstance> {
  return import(pathToFileURL(serverPath).href)
    .then((m: { default: import('fastify').FastifyInstance }) => m.default)
    .catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err)
      throw new Error(`Failed to load server from ${serverPath}: ${msg}`)
    })
}

function getApp(): Promise<import('fastify').FastifyInstance> {
  if (!appPromise) {
    appPromise = Promise.resolve()
      .then(() => resolveServerPath())
      .then((serverPath) => loadServer(serverPath))
  }
  return appPromise
}

type HeaderMap = Record<string, string>

function headersFromFastify(headers: Record<string, string | string[] | undefined>): HeaderMap {
  const out: HeaderMap = {}
  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) continue
    if (Array.isArray(value)) {
      out[key] = value.join(', ')
    } else {
      out[key] = value
    }
  }
  return out
}

function getRequestOrigin(request: FetchRequest): string | undefined {
  for (const [key, value] of request.headers.entries()) {
    if (key.toLowerCase() === 'origin' && value) return value
  }
  return undefined
}

function ensureCorsHeaders(request: FetchRequest, headers: HeaderMap): HeaderMap {
  const origin = getRequestOrigin(request)
  if (!origin) return headers

  if (!headers['access-control-allow-origin']) {
    headers['access-control-allow-origin'] = origin
  }
  if (!headers['access-control-allow-credentials']) {
    headers['access-control-allow-credentials'] = 'true'
  }
  if (!headers.vary) {
    headers.vary = 'Origin'
  } else if (!headers.vary.toLowerCase().includes('origin')) {
    headers.vary = `${headers.vary}, Origin`
  }
  return headers
}

export default {
  async fetch(request: FetchRequest): Promise<Response> {
    try {
      const app = await getApp()
      const url = new URL(request.url)
      // Keep pathname as-is. Versioned routes use `/v1/...` (see controllers/v1).
      const path = (url.pathname || '/') + url.search
      const headers: Record<string, string> = {}
      for (const [key, value] of request.headers.entries()) {
        headers[key] = value
      }
      const body = await request.text().catch(() => '')
      const payload = body || undefined

      const response = (await app.inject({
        method: request.method as HTTPMethods,
        url: path,
        headers,
        payload
      })) as InjectResponse

      // Fetch Response forbids a body for certain status codes (e.g. 204 preflight).
      const status = response.statusCode
      const statusDisallowsBody = status === 204 || status === 205 || status === 304
      const bodyOut = statusDisallowsBody ? undefined : injectBodyToBodyInit(response.body)
      const responseHeaders = ensureCorsHeaders(request, headersFromFastify(response.headers))
      return new Response(bodyOut, {
        status,
        headers: responseHeaders
      })
    } catch (err: unknown) {
      console.error('[api]', err)
      const message = err instanceof Error ? err.message : String(err)
      // Startup/load failures (e.g. missing env, failed import) -> 503 so client knows service is unavailable
      const status = message && /required|failed|cannot find|ENOENT|MODULE_NOT_FOUND/i.test(message) ? 503 : 500
      const errorHeaders = ensureCorsHeaders(request, { 'Content-Type': 'application/json' })
      return new Response(
        JSON.stringify({
          error: status === 503 ? 'Service Unavailable' : 'Internal Server Error',
          message: process.env.VERCEL ? message : undefined
        }),
        { status, headers: errorHeaders }
      )
    }
  }
}
