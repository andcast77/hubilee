/**
 * Integration tests — PLAN-26: auth session hardening (lockout, refresh rotation, sessions API).
 *
 * Requires DATABASE_URL (see integration/setup.ts).
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import type { FastifyInstance } from 'fastify'
import { prisma } from '@/db'

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

describe('PLAN-26: auth session hardening', () => {
  let app: FastifyInstance

  const suffix = randomUUID().slice(0, 8)
  const lockoutEmail = `plan26-lock-${suffix}@test.local`
  const adminEmail = `plan26-admin-${suffix}@test.local`
  const correctPassword = 'CorrectPass123!'

  let lockoutUserId: string
  let lockoutCompanyId: string
  let adminUserId: string
  let adminCompanyId: string

  beforeAll(async () => {
    process.env.MAX_LOGIN_ATTEMPTS = '3'
    process.env.LOCKOUT_DURATION_MINUTES = '15'
    process.env.JWT_ACCESS_EXPIRES_IN = '15m'

    const mod = await import('../../server.js')
    app = mod.default as FastifyInstance

    const pwHash = await bcrypt.hash(correctPassword, 10)

    const coLock = await prisma.company.create({
      data: { name: `Plan26LockCo-${suffix}` },
    })
    lockoutCompanyId = coLock.id
    const uLock = await prisma.user.create({
      data: {
        email: lockoutEmail,
        password: pwHash,
        firstName: 'Lock',
        lastName: 'User',
        role: 'USER',
        isActive: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    })
    lockoutUserId = uLock.id
    await prisma.companyMember.create({
      data: { userId: uLock.id, companyId: coLock.id, membershipRole: 'USER' },
    })

    const coAdm = await prisma.company.create({
      data: { name: `Plan26AdminCo-${suffix}` },
    })
    adminCompanyId = coAdm.id
    const uAdm = await prisma.user.create({
      data: {
        email: adminEmail,
        password: pwHash,
        firstName: 'Admin',
        lastName: 'Sessions',
        role: 'ADMIN',
        isActive: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    })
    adminUserId = uAdm.id
    await prisma.companyMember.create({
      data: { userId: uAdm.id, companyId: coAdm.id, membershipRole: 'ADMIN' },
    })
  }, 120_000)

  describe('account lockout', () => {
    it('returns 401 on wrong password before threshold', async () => {
      const { res } = await inject(app, {
        method: 'POST',
        url: '/v1/auth/login',
        payload: { email: lockoutEmail, password: 'wrong-password', companyId: lockoutCompanyId },
      })
      expect(res.statusCode).toBe(401)
    })

    it('locks account with 429 after MAX_LOGIN_ATTEMPTS failures', async () => {
      await prisma.user.update({
        where: { id: lockoutUserId },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      })

      for (let i = 0; i < 2; i++) {
        const { res } = await inject(app, {
          method: 'POST',
          url: '/v1/auth/login',
          payload: { email: lockoutEmail, password: 'bad', companyId: lockoutCompanyId },
        })
        expect(res.statusCode).toBe(401)
      }

      const { res, body } = await inject(app, {
        method: 'POST',
        url: '/v1/auth/login',
        payload: { email: lockoutEmail, password: 'bad', companyId: lockoutCompanyId },
      })
      expect(res.statusCode).toBe(429)
      expect(body?.code).toBe('ACCOUNT_LOCKED')

      const locked = await prisma.user.findUnique({
        where: { id: lockoutUserId },
        select: { lockedUntil: true, failedLoginAttempts: true },
      })
      expect(locked?.lockedUntil).toBeTruthy()
      expect(locked?.lockedUntil!.getTime()).toBeGreaterThan(Date.now())
      expect(locked?.failedLoginAttempts).toBeGreaterThanOrEqual(3)
    })

    it('rejects login with 429 while locked even with correct password', async () => {
      const { res, body } = await inject(app, {
        method: 'POST',
        url: '/v1/auth/login',
        payload: { email: lockoutEmail, password: correctPassword, companyId: lockoutCompanyId },
      })
      expect(res.statusCode).toBe(429)
      expect(body?.code).toBe('ACCOUNT_LOCKED')
    })

    it('allows login after lock fields are cleared', async () => {
      await prisma.user.update({
        where: { id: lockoutUserId },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      })

      const { res, body } = await inject(app, {
        method: 'POST',
        url: '/v1/auth/login',
        payload: { email: lockoutEmail, password: correctPassword, companyId: lockoutCompanyId },
      })
      expect(res.statusCode).toBe(200)
      expect(body.success).toBe(true)
      expect(body.data?.user?.email).toBe(lockoutEmail)
      const c = cookieHeaderFromInject(res)
      expect(c).toContain('ms_session=')
      expect(c).toContain('ms_refresh=')
    })
  })

  describe('refresh + session cookies', () => {
    it('POST /v1/auth/refresh returns 200 and rotates cookies when refresh is valid', async () => {
      const login = await inject(app, {
        method: 'POST',
        url: '/v1/auth/login',
        payload: { email: adminEmail, password: correctPassword, companyId: adminCompanyId },
      })
      expect(login.res.statusCode).toBe(200)
      const cookie1 = cookieHeaderFromInject(login.res)
      expect(cookie1).toMatch(/ms_session=/)
      expect(cookie1).toMatch(/ms_refresh=/)

      const refresh = await inject(app, {
        method: 'POST',
        url: '/v1/auth/refresh',
        headers: { cookie: cookie1 },
      })
      expect(refresh.res.statusCode).toBe(200)
      expect(refresh.body.success).toBe(true)
      expect(refresh.body.data?.refreshed).toBe(true)
      const cookie2 = cookieHeaderFromInject(refresh.res)
      expect(cookie2).toMatch(/ms_session=/)
      expect(cookie2).toMatch(/ms_refresh=/)

      const me = await inject(app, {
        method: 'GET',
        url: '/v1/auth/me',
        headers: { cookie: cookie2 },
      })
      expect(me.res.statusCode).toBe(200)
      expect(me.body.data?.email).toBe(adminEmail)
    })
  })

  describe('active sessions list and revoke', () => {
    it('ADMIN: two logins → two rows; DELETE session revokes one; list hides sessionToken', async () => {
      await prisma.session.deleteMany({ where: { userId: adminUserId } })

      const first = await inject(app, {
        method: 'POST',
        url: '/v1/auth/login',
        payload: { email: adminEmail, password: correctPassword, companyId: adminCompanyId },
      })
      expect(first.res.statusCode).toBe(200)
      const cookiesA = cookieHeaderFromInject(first.res)

      const second = await inject(app, {
        method: 'POST',
        url: '/v1/auth/login',
        payload: { email: adminEmail, password: correctPassword, companyId: adminCompanyId },
      })
      expect(second.res.statusCode).toBe(200)
      const cookiesB = cookieHeaderFromInject(second.res)

      const listB = await inject(app, {
        method: 'GET',
        url: '/v1/auth/sessions',
        headers: { cookie: cookiesB },
      })
      expect(listB.res.statusCode).toBe(200)
      const items = listB.body.data as Array<{
        id: string
        isCurrent: boolean
        sessionToken?: string
      }>
      expect(items.length).toBe(2)
      expect(items.every((r) => r.sessionToken === undefined)).toBe(true)
      const other = items.find((r) => !r.isCurrent)
      expect(other).toBeDefined()

      const del = await inject(app, {
        method: 'DELETE',
        url: `/v1/auth/sessions/session/${other!.id}`,
        headers: { cookie: cookiesB },
      })
      expect(del.res.statusCode).toBe(200)

      const listAfter = await inject(app, {
        method: 'GET',
        url: '/v1/auth/sessions',
        headers: { cookie: cookiesB },
      })
      expect(listAfter.body.data.length).toBe(1)
      expect(listAfter.body.data[0].isCurrent).toBe(true)
    })

    it('DELETE /v1/auth/sessions revokes all other sessions (cookie-based)', async () => {
      await prisma.session.deleteMany({ where: { userId: adminUserId } })

      const first = await inject(app, {
        method: 'POST',
        url: '/v1/auth/login',
        payload: { email: adminEmail, password: correctPassword, companyId: adminCompanyId },
      })
      const cookiesA = cookieHeaderFromInject(first.res)

      const second = await inject(app, {
        method: 'POST',
        url: '/v1/auth/login',
        payload: { email: adminEmail, password: correctPassword, companyId: adminCompanyId },
      })
      const cookiesB = cookieHeaderFromInject(second.res)

      const bulk = await inject(app, {
        method: 'DELETE',
        url: '/v1/auth/sessions',
        headers: { cookie: cookiesB },
      })
      expect(bulk.res.statusCode).toBe(200)

      const listB = await inject(app, {
        method: 'GET',
        url: '/v1/auth/sessions',
        headers: { cookie: cookiesB },
      })
      expect(listB.body.data.length).toBe(1)

      // Revoked session: refresh row deleted — refresh must fail (no Redis required).
      const refreshA = await inject(app, {
        method: 'POST',
        url: '/v1/auth/refresh',
        headers: { cookie: cookiesA },
      })
      expect(refreshA.res.statusCode).toBe(401)
    })

    it('cookie access JWT is rejected after logout when session row is gone (no Redis required)', async () => {
      await prisma.session.deleteMany({ where: { userId: adminUserId } })

      const login = await inject(app, {
        method: 'POST',
        url: '/v1/auth/login',
        payload: { email: adminEmail, password: correctPassword, companyId: adminCompanyId },
      })
      expect(login.res.statusCode).toBe(200)
      const cookies = cookieHeaderFromInject(login.res)

      const meOk = await inject(app, {
        method: 'GET',
        url: '/v1/auth/me',
        headers: { cookie: cookies },
      })
      expect(meOk.res.statusCode).toBe(200)

      const out = await inject(app, {
        method: 'POST',
        url: '/v1/auth/logout',
        headers: { cookie: cookies },
      })
      expect(out.res.statusCode).toBe(200)

      const meFail = await inject(app, {
        method: 'GET',
        url: '/v1/auth/me',
        headers: { cookie: cookies },
      })
      expect(meFail.res.statusCode).toBe(401)
    })
  })
})
