import type { NextRequest } from 'next/server'
import { corsPreflightResponse, jsonWithCors } from '@/lib/http'
import { clearSessionCookies, revokeRefreshByRaw } from '@/lib/auth/session'
import { REFRESH_COOKIE } from '@/lib/auth/cookies'

export async function OPTIONS(request: NextRequest) {
  return corsPreflightResponse(request) ?? new Response(null, { status: 204 })
}

export async function POST(request: NextRequest) {
  const raw = request.cookies.get(REFRESH_COOKIE)?.value
  await revokeRefreshByRaw(raw)

  const res = jsonWithCors(request, { ok: true }, { status: 200 })
  clearSessionCookies(res)
  return res
}
