/**
 * PLAN-17 / PLAN-30: Cross-tenant isolation tests for SSE endpoints (metrics + presence).
 *
 * Verifies:
 *  1. Unauthenticated requests to SSE are rejected with 401.
 *  2. A user from Tenant B cannot subscribe to Tenant A's SSE stream (403).
 *  3. A user from Tenant A can connect to their own SSE stream (200).
 */
import { describe, it, expect, beforeAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { prisma } from '@hubilee/database'

import './setup'
import { generateToken } from '../../core/auth.js'

describe('PLAN-17: Realtime endpoint cross-tenant isolation', () => {
  let app: FastifyInstance

  let acmeCompanyId: string
  let acmeOwnerToken: string
  let betaOwnerToken: string

  beforeAll(async () => {
    const mod = await import('../../server.js')
    app = mod.default as FastifyInstance

    const acme = await prisma.company.findFirst({ where: { name: 'Acme Inc.' } })
    const beta = await prisma.company.findFirst({ where: { name: 'Beta Corp.' } })
    if (!acme || !beta) throw new Error('Missing seeded companies (Acme Inc., Beta Corp.)')
    acmeCompanyId = acme.id

    const acmeOwnerUser = await prisma.user.findUnique({ where: { email: 'gerente@acme.com' } })
    const betaOwnerUser = await prisma.user.findUnique({ where: { email: 'gerente@betacorp.com' } })
    if (!acmeOwnerUser || !betaOwnerUser) throw new Error('Missing seeded users')

    acmeOwnerToken = generateToken({
      id: acmeOwnerUser.id,
      email: acmeOwnerUser.email,
      role: acmeOwnerUser.role,
      companyId: acme.id,
      isSuperuser: acmeOwnerUser.isSuperuser,
    })
    betaOwnerToken = generateToken({
      id: betaOwnerUser.id,
      email: betaOwnerUser.email,
      role: betaOwnerUser.role,
      companyId: beta.id,
      isSuperuser: betaOwnerUser.isSuperuser,
    })
  }, 60_000)

  // ── SSE endpoint ────────────────────────────────────────────────────────────

  describe('GET /v1/events/metrics/:companyId (SSE)', () => {
    it('returns 401 when no token is provided', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/v1/events/metrics/${acmeCompanyId}`,
      })
      expect(res.statusCode).toBe(401)
    })

    it('returns 403 when user belongs to a different tenant', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/v1/events/metrics/${acmeCompanyId}`,
        headers: { Authorization: `Bearer ${betaOwnerToken}` },
      })
      expect(res.statusCode).toBe(403)
    })

    it('opens the SSE stream when user belongs to the requested tenant', async () => {
      // reply.hijack() keeps the connection open — inject never resolves for a live SSE stream.
      // We race against a short timeout: null means the stream is open (auth passed + streaming).
      // A non-null result with 401/403 would mean the request was rejected.
      const result = await Promise.race<Awaited<ReturnType<typeof app.inject>> | null>([
        app.inject({
          method: 'GET',
          url: `/v1/events/metrics/${acmeCompanyId}`,
          headers: { Authorization: `Bearer ${acmeOwnerToken}` },
        }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 300)),
      ])

      if (result !== null) {
        // If inject resolved synchronously it must be 200 (not a rejection)
        expect(result.statusCode).toBe(200)
      }
      // null = SSE stream is open and streaming — correct behavior
    }, 10_000)

    it('accepts ?token= query param as auth fallback (EventSource compatibility)', async () => {
      const result = await Promise.race<Awaited<ReturnType<typeof app.inject>> | null>([
        app.inject({
          method: 'GET',
          url: `/v1/events/metrics/${acmeCompanyId}?token=${acmeOwnerToken}`,
        }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 300)),
      ])

      if (result !== null) {
        expect(result.statusCode).toBe(200)
      }
      // null = SSE stream is open — correct behavior
    }, 10_000)

    it('rejects ?token= query param for wrong tenant', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/v1/events/metrics/${acmeCompanyId}?token=${betaOwnerToken}`,
      })
      expect(res.statusCode).toBe(403)
    })
  })

  // ── SSE presence endpoint ───────────────────────────────────────────────────

  describe('GET /v1/events/presence/:companyId (SSE)', () => {
    it('returns 401 when no token is provided', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/v1/events/presence/${acmeCompanyId}`,
      })
      expect(res.statusCode).toBe(401)
    })

    it('returns 403 when user belongs to a different tenant', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/v1/events/presence/${acmeCompanyId}`,
        headers: { Authorization: `Bearer ${betaOwnerToken}` },
      })
      expect(res.statusCode).toBe(403)
    })

    it('opens the SSE stream when user belongs to the requested tenant', async () => {
      const result = await Promise.race<Awaited<ReturnType<typeof app.inject>> | null>([
        app.inject({
          method: 'GET',
          url: `/v1/events/presence/${acmeCompanyId}`,
          headers: { Authorization: `Bearer ${acmeOwnerToken}` },
        }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 300)),
      ])

      if (result !== null) {
        expect(result.statusCode).toBe(200)
      }
    }, 10_000)

    it('accepts ?token= query param as auth fallback (EventSource compatibility)', async () => {
      const result = await Promise.race<Awaited<ReturnType<typeof app.inject>> | null>([
        app.inject({
          method: 'GET',
          url: `/v1/events/presence/${acmeCompanyId}?token=${acmeOwnerToken}`,
        }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 300)),
      ])

      if (result !== null) {
        expect(result.statusCode).toBe(200)
      }
    }, 10_000)

    it('rejects ?token= query param for wrong tenant', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/v1/events/presence/${acmeCompanyId}?token=${betaOwnerToken}`,
      })
      expect(res.statusCode).toBe(403)
    })
  })
})
