import type { NextRequest } from 'next/server'
import { authCredentialsSchema } from '@/lib/auth/schemas'
import { clientIp, corsPreflightResponse, jsonWithCors, rateLimitHit } from '@/lib/http'
import { createSessionTokens, setSessionCookies } from '@/lib/auth/session'
import { verifyPassword } from '@/lib/auth/crypto'
import { prisma } from '@/lib/prisma'

export async function OPTIONS(request: NextRequest) {
  return corsPreflightResponse(request) ?? new Response(null, { status: 204 })
}

export async function POST(request: NextRequest) {
  const rl = rateLimitHit(`login:${clientIp(request)}`)
  if (!rl.ok) {
    return jsonWithCors(
      request,
      { error: 'too_many_requests', message: 'Demasiados intentos. Probá más tarde.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    )
  }

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return jsonWithCors(
      request,
      { error: 'invalid_json', message: 'Cuerpo JSON inválido.' },
      {
        status: 400,
      }
    )
  }

  const parsed = authCredentialsSchema.safeParse(json)
  if (!parsed.success) {
    return jsonWithCors(
      request,
      {
        error: 'validation_error',
        issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message })),
      },
      { status: 400 }
    )
  }

  const { email, password } = parsed.data
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    await new Promise((r) => setTimeout(r, 300))
    return jsonWithCors(
      request,
      { error: 'invalid_credentials', message: 'Credenciales inválidas.' },
      { status: 401 }
    )
  }

  const session = await createSessionTokens(user.id, user.email)
  if (!session) {
    return jsonWithCors(
      request,
      { error: 'server_misconfigured', message: 'JWT_ACCESS_SECRET no está configurado.' },
      { status: 500 }
    )
  }

  const res = jsonWithCors(request, { id: user.id, email: user.email }, { status: 200 })
  setSessionCookies(res, session.accessToken, session.refreshRaw)
  return res
}
