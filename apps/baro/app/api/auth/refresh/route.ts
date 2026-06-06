import type { NextRequest } from 'next/server'
import { REFRESH_COOKIE } from '@/lib/auth/cookies'
import { clientIp, corsPreflightResponse, jsonWithCors, rateLimitHit } from '@/lib/http'
import { createSessionTokens, setSessionCookies } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { hashRefreshToken } from '@/lib/auth/crypto'

export async function OPTIONS(request: NextRequest) {
  return corsPreflightResponse(request) ?? new Response(null, { status: 204 })
}

export async function POST(request: NextRequest) {
  const rl = rateLimitHit(`refresh:${clientIp(request)}`)
  if (!rl.ok) {
    return jsonWithCors(
      request,
      { error: 'too_many_requests', message: 'Demasiados intentos. Probá más tarde.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    )
  }

  const raw = request.cookies.get(REFRESH_COOKIE)?.value
  if (!raw) {
    return jsonWithCors(
      request,
      { error: 'unauthorized', message: 'Sesión no válida.' },
      {
        status: 401,
      }
    )
  }

  const tokenHash = hashRefreshToken(raw)
  const row = await prisma.refreshToken.findFirst({
    where: {
      tokenHash,
      expiresAt: { gt: new Date() },
    },
    include: { user: true },
  })

  if (!row) {
    return jsonWithCors(
      request,
      { error: 'unauthorized', message: 'Sesión no válida.' },
      {
        status: 401,
      }
    )
  }

  await prisma.refreshToken.delete({ where: { id: row.id } })

  const session = await createSessionTokens(row.userId, row.user.email)
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
