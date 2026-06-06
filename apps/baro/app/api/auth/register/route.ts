import type { NextRequest } from 'next/server'
import { authCredentialsSchema } from '@/lib/auth/schemas'
import { clientIp, corsPreflightResponse, jsonWithCors, rateLimitHit } from '@/lib/http'
import { hashPassword } from '@/lib/auth/crypto'
import { createSessionTokens, setSessionCookies } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'

export async function OPTIONS(request: NextRequest) {
  return corsPreflightResponse(request) ?? new Response(null, { status: 204 })
}

export async function POST(request: NextRequest) {
  const rl = rateLimitHit(`register:${clientIp(request)}`)
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

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return jsonWithCors(
      request,
      { error: 'email_taken', message: 'Este email ya está registrado.' },
      { status: 409 }
    )
  }

  const passwordHash = await hashPassword(password)
  const user = await prisma.user.create({
    data: { email, passwordHash },
  })

  const session = await createSessionTokens(user.id, user.email)
  if (!session) {
    return jsonWithCors(
      request,
      { error: 'server_misconfigured', message: 'JWT_ACCESS_SECRET no está configurado.' },
      { status: 500 }
    )
  }

  const res = jsonWithCors(request, { id: user.id, email: user.email }, { status: 201 })
  setSessionCookies(res, session.accessToken, session.refreshRaw)
  return res
}
