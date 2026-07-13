/**
 * Integration tests — web-desktop-vite-tauri PR1: gated, additive auth-token change.
 *
 * Web (cookie) clients MUST see byte-for-byte unchanged behavior (no `X-Client` header):
 * tokens ONLY via Set-Cookie, refresh via cookie only, response bodies unchanged.
 *
 * Desktop clients (`X-Client: desktop` header) ADDITIONALLY receive
 * `data.tokens.{accessToken,refreshToken}` in the body for login/refresh, and can
 * refresh using a body-supplied `refreshToken` with no cookie present.
 *
 * Requires DATABASE_URL (see integration/setup.ts).
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import type { FastifyInstance } from 'fastify'
import { prisma } from '@multisystem/database'

import './setup'

async function inject(
  app: FastifyInstance,
  opts: Parameters<FastifyInstance['inject']>[0],
): Promise<{ res: Awaited<ReturnType<FastifyInstance['inject']>>; body: any }> {
  const res = await app.inject(opts)
  let body: any = null
  if (res.body) {
    const raw =
      typeof res.body === 'string'
        ? res.body
        : typeof (res.body as Buffer).toString === 'function'
          ? (res.body as Buffer).toString('utf8')
          : String(res.body)
    try {
      body = JSON.parse(raw)
    } catch {
      body = raw
    }
  }
  return { res, body }
}

/** Build `Cookie: a=b; c=d` from inject `set-cookie` response headers. */
function cookieHeaderFromInject(res: { headers: Record<string, unknown> }): string {
  const raw = res.headers['set-cookie']
  const parts = Array.isArray(raw) ? raw : raw != null ? [String(raw)] : []
  return parts
    .map((line) => line.split(';')[0]?.trim())
    .filter(Boolean)
    .join('; ')
}

function setCookieNamesFromInject(res: { headers: Record<string, unknown> }): string[] {
  const raw = res.headers['set-cookie']
  const parts = Array.isArray(raw) ? raw : raw != null ? [String(raw)] : []
  return parts.map((line) => line.split('=')[0]?.trim()).filter(Boolean) as string[]
}

describe('web-desktop-vite-tauri PR1: gated desktop auth tokens', () => {
  let app: FastifyInstance

  const suffix = randomUUID().slice(0, 8)
  const email = `wdvt01-${suffix}@test.local`
  const password = 'CorrectPass123!'

  let companyId: string

  beforeAll(async () => {
    const mod = await import('../../server.js')
    app = mod.default as FastifyInstance

    const pwHash = await bcrypt.hash(password, 10)
    const company = await prisma.company.create({
      data: { name: `Wdvt01Co-${suffix}` },
    })
    companyId = company.id
    const user = await prisma.user.create({
      data: {
        email,
        password: pwHash,
        firstName: 'Wdvt',
        lastName: 'Desktop',
        // ADMIN allows concurrent sessions (see authService.createWebSessionPair) —
        // this suite logs in repeatedly across independent test cases.
        role: 'ADMIN',
        isActive: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    })
    await prisma.companyMember.create({
      data: { userId: user.id, companyId: company.id, membershipRole: 'ADMIN' },
    })
  }, 120_000)

  describe('web (cookie) client — characterization, must stay unchanged', () => {
    it('login WITHOUT X-Client: body has NO tokens field, Set-Cookie present as before', async () => {
      const { res, body } = await inject(app, {
        method: 'POST',
        url: '/v1/auth/login',
        payload: { email, password, companyId },
      })
      expect(res.statusCode).toBe(200)
      expect(body.success).toBe(true)
      expect(body.data).not.toHaveProperty('tokens')
      expect(body.data).not.toHaveProperty('token')
      const cookieNames = setCookieNamesFromInject(res)
      expect(cookieNames).toContain('ms_session')
      expect(cookieNames).toContain('ms_refresh')
    })

    it('refresh via cookie (no X-Client): returns {refreshed:true}, no tokens leaked in body, cookies rotate as before', async () => {
      const login = await inject(app, {
        method: 'POST',
        url: '/v1/auth/login',
        payload: { email, password, companyId },
      })
      const cookie1 = cookieHeaderFromInject(login.res)

      const refresh = await inject(app, {
        method: 'POST',
        url: '/v1/auth/refresh',
        headers: { cookie: cookie1 },
      })
      expect(refresh.res.statusCode).toBe(200)
      expect(refresh.body.data).toEqual({ refreshed: true })
      const cookieNames = setCookieNamesFromInject(refresh.res)
      expect(cookieNames).toContain('ms_session')
      expect(cookieNames).toContain('ms_refresh')

      const cookie2 = cookieHeaderFromInject(refresh.res)
      const me = await inject(app, {
        method: 'GET',
        url: '/v1/auth/me',
        headers: { cookie: cookie2 },
      })
      expect(me.res.statusCode).toBe(200)
      expect(me.body.data?.email).toBe(email)
    })
  })

  describe('desktop client (X-Client: desktop) — new additive behavior', () => {
    it('login WITH X-Client: desktop returns data.tokens {accessToken, refreshToken}', async () => {
      const { res, body } = await inject(app, {
        method: 'POST',
        url: '/v1/auth/login',
        headers: { 'x-client': 'desktop' },
        payload: { email, password, companyId },
      })
      expect(res.statusCode).toBe(200)
      expect(body.success).toBe(true)
      expect(typeof body.data?.tokens?.accessToken).toBe('string')
      expect(body.data.tokens.accessToken.length).toBeGreaterThan(0)
      expect(typeof body.data?.tokens?.refreshToken).toBe('string')
      expect(body.data.tokens.refreshToken.length).toBeGreaterThan(0)
    })

    it('refresh WITH X-Client: desktop + body refreshToken (no cookie) returns a new token pair and rotates the session', async () => {
      const login = await inject(app, {
        method: 'POST',
        url: '/v1/auth/login',
        headers: { 'x-client': 'desktop' },
        payload: { email, password, companyId },
      })
      const firstRefreshToken = login.body.data.tokens.refreshToken as string

      const refresh = await inject(app, {
        method: 'POST',
        url: '/v1/auth/refresh',
        headers: { 'x-client': 'desktop' },
        payload: { refreshToken: firstRefreshToken },
      })
      expect(refresh.res.statusCode).toBe(200)
      const newTokens = refresh.body.data?.tokens
      expect(typeof newTokens?.accessToken).toBe('string')
      expect(typeof newTokens?.refreshToken).toBe('string')
      expect(newTokens.refreshToken).not.toBe(firstRefreshToken)

      // Old refresh token must be invalidated (rotation persisted).
      const reuseOld = await inject(app, {
        method: 'POST',
        url: '/v1/auth/refresh',
        headers: { 'x-client': 'desktop' },
        payload: { refreshToken: firstRefreshToken },
      })
      expect(reuseOld.res.statusCode).toBe(401)

      // New refresh token must work.
      const useNew = await inject(app, {
        method: 'POST',
        url: '/v1/auth/refresh',
        headers: { 'x-client': 'desktop' },
        payload: { refreshToken: newTokens.refreshToken },
      })
      expect(useNew.res.statusCode).toBe(200)
    })

    it('refresh with an invalid token (X-Client: desktop, no cookie) returns 401 and leaks no tokens', async () => {
      const { res, body } = await inject(app, {
        method: 'POST',
        url: '/v1/auth/refresh',
        headers: { 'x-client': 'desktop' },
        payload: { refreshToken: 'not-a-real-refresh-token' },
      })
      expect(res.statusCode).toBe(401)
      expect(body?.data).toBeFalsy()
    })
  })
})
