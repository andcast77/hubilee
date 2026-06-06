import type { NextRequest } from 'next/server'
import { changePasswordSchema } from '@/lib/auth/schemas'
import { clientIp, corsPreflightResponse, jsonWithCors, rateLimitHit } from '@/lib/http'
import { ACCESS_COOKIE } from '@/lib/auth/cookies'
import { createSessionTokens, setSessionCookies } from '@/lib/auth/session'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { hashPassword, verifyPassword } from '@/lib/auth/crypto'
import { prisma } from '@/lib/prisma'

async function requireUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(ACCESS_COOKIE)?.value
  const v = await verifyAccessToken(token)
  if (!v.ok) return null
  return v.payload.sub
}

export async function OPTIONS(request: NextRequest) {
  return corsPreflightResponse(request) ?? new Response(null, { status: 204 })
}

export async function POST(request: NextRequest) {
  const userId = await requireUserId(request)
  if (!userId) {
    return jsonWithCors(
      request,
      { error: 'unauthorized', message: 'No autenticado.' },
      { status: 401 }
    )
  }

  const rl = rateLimitHit(`password-change:${userId}:${clientIp(request)}`)
  if (!rl.ok) {
    return jsonWithCors(
      request,
      { error: 'too_many_requests', message: 'Demasiados intentos. Probá más tarde.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonWithCors(
      request,
      { error: 'invalid_json', message: 'Cuerpo JSON inválido.' },
      {
        status: 400,
      }
    )
  }

  const parsed = changePasswordSchema.safeParse(body)
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

  const { currentPassword, newPassword } = parsed.data

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    return jsonWithCors(
      request,
      { error: 'not_found', message: 'Usuario no encontrado.' },
      { status: 404 }
    )
  }

  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    await new Promise((r) => setTimeout(r, 300))
    return jsonWithCors(
      request,
      { error: 'invalid_password', message: 'La contraseña actual no es correcta.' },
      { status: 401 }
    )
  }

  const passwordHash = await hashPassword(newPassword)

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
    prisma.refreshToken.deleteMany({ where: { userId } }),
  ])

  const session = await createSessionTokens(userId, user.email)
  if (!session) {
    return jsonWithCors(
      request,
      { error: 'server_misconfigured', message: 'JWT_ACCESS_SECRET no está configurado.' },
      { status: 500 }
    )
  }

  const res = jsonWithCors(request, { ok: true }, { status: 200 })
  setSessionCookies(res, session.accessToken, session.refreshRaw)
  return res
}
