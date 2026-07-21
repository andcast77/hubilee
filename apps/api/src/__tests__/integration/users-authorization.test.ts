import { describe, it, expect, beforeAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import type { FastifyInstance } from 'fastify'
import { prisma } from '@/db'

// Must be imported before we import the API server (env + migrations/seed).
import './setup'

import { generateToken } from '../../core/auth.js'

type InjectResult = {
  statusCode: number
  payload: unknown
}

function getJsonPayload(res: InjectResult): any {
  if (res.payload == null) return null
  if (typeof res.payload === 'string') return JSON.parse(res.payload)
  if (typeof res.payload === 'object') return res.payload
  return JSON.parse(String(res.payload))
}

async function injectJson(app: FastifyInstance, opts: Parameters<FastifyInstance['inject']>[0]) {
  const res = await app.inject(opts)
  return { res: res as unknown as InjectResult, json: getJsonPayload(res as unknown as InjectResult) }
}

describe('Plan 7 / Task 1: Users Authorization regression', () => {
  let app: FastifyInstance

  let acmeCompanyId: string
  let betaCompanyId: string

  let acmeOwnerUserId: string
  let acmeOwnerToken: string

  let acmeMembershipUserMismatchId: string
  let acmeMembershipUserMismatchToken: string

  let orphanUserToken: string
  let betaUserId: string

  beforeAll(async () => {
    // Import after setup env is applied (server bootstraps immediately via top-level await).
    const mod = await import('../../server.js')
    app = mod.default as FastifyInstance

    async function ensureCoreFixtures() {
      const acme = await prisma.company.findFirst({ where: { name: 'Acme Inc.' } })
      const beta = await prisma.company.findFirst({ where: { name: 'Beta Corp.' } })
      if (!acme || !beta) {
        const [createdAcme, createdBeta] = await Promise.all([
          acme
            ? Promise.resolve(acme)
            : prisma.company.create({ data: { name: 'Acme Inc.' } }),
          beta
            ? Promise.resolve(beta)
            : prisma.company.create({ data: { name: 'Beta Corp.' } }),
        ])
        return { acme: createdAcme, beta: createdBeta }
      }
      return { acme, beta }
    }

    const { acme, beta } = await ensureCoreFixtures()
    acmeCompanyId = acme.id
    betaCompanyId = beta.id

    const hashedPassword = await bcrypt.hash('password123', 10)

    const acmeOwnerUser =
      (await prisma.user.findUnique({ where: { email: 'gerente@acme.com' } })) ??
      (await prisma.user.create({
        data: {
          email: 'gerente@acme.com',
          password: hashedPassword,
          firstName: 'Roberto',
          lastName: 'Acme',
          phone: '+1234567890',
          role: 'ADMIN',
          isActive: true,
          isSuperuser: false,
        },
      }))

    const betaUser =
      (await prisma.user.findUnique({ where: { email: 'ventas@betacorp.com' } })) ??
      (await prisma.user.create({
        data: {
          email: 'ventas@betacorp.com',
          password: hashedPassword,
          firstName: 'Diego',
          lastName: 'Beta',
          phone: '+1987654321',
          role: 'USER',
          isActive: true,
          isSuperuser: false,
        },
      }))

    // Ensure membership rows exist (tests rely on them for company resolution + role gating).
    await prisma.companyMember.upsert({
      where: { userId_companyId: { userId: acmeOwnerUser.id, companyId: acmeCompanyId } },
      update: { membershipRole: 'OWNER' },
      create: { userId: acmeOwnerUser.id, companyId: acmeCompanyId, membershipRole: 'OWNER' },
    })
    await prisma.companyMember.upsert({
      where: { userId_companyId: { userId: betaUser.id, companyId: betaCompanyId } },
      update: { membershipRole: 'USER' },
      create: { userId: betaUser.id, companyId: betaCompanyId, membershipRole: 'USER' },
    })

    acmeOwnerUserId = acmeOwnerUser.id
    betaUserId = betaUser.id

    acmeOwnerToken = generateToken({
      id: acmeOwnerUser.id,
      email: acmeOwnerUser.email,
      role: acmeOwnerUser.role,
      isSuperuser: acmeOwnerUser.isSuperuser,
    })

    // Fixture (b): JWT role=ADMIN but company membershipRole=USER => must be rejected by requireRole().
    const mismatchUser = await prisma.user.create({
      data: {
        email: 'mismatch-admin-but-member-user@acme.test',
        password: hashedPassword,
        firstName: 'Mismatch',
        lastName: 'Admin',
        phone: null,
        role: 'ADMIN',
        isActive: true,
        isSuperuser: false,
      },
    })
    await prisma.companyMember.create({
      data: { userId: mismatchUser.id, companyId: acmeCompanyId, membershipRole: 'USER' },
    })

    acmeMembershipUserMismatchId = mismatchUser.id
    acmeMembershipUserMismatchToken = generateToken({
      id: mismatchUser.id,
      email: mismatchUser.email,
      role: mismatchUser.role,
      isSuperuser: mismatchUser.isSuperuser,
    })

    // Fixture (a): orphan user not in any company => requireCompanyContext() must return 401.
    const orphanUser = await prisma.user.create({
      data: {
        email: `orphan-${Date.now()}@users-auth-test.local`,
        password: hashedPassword,
        firstName: 'Orphan',
        lastName: 'User',
        phone: null,
        role: 'ADMIN',
        isActive: true,
        isSuperuser: false,
      },
    })

    orphanUserToken = generateToken({
      id: orphanUser.id,
      email: orphanUser.email,
      role: orphanUser.role,
      isSuperuser: orphanUser.isSuperuser,
    })

    // Sanity check: mismatch membershipRole is actually USER in the resolved acme company.
    const mismatchMembership = await prisma.companyMember.findUnique({
      where: { userId_companyId: { userId: acmeMembershipUserMismatchId, companyId: acmeCompanyId } },
    })
    if (!mismatchMembership || mismatchMembership.membershipRole !== 'USER') {
      throw new Error('Mismatch fixture failed to create companyMember with membershipRole USER')
    }

    // Sanity check: target user belongs to beta and not acme (cross-tenant).
    const targetInAcme = await prisma.companyMember.findUnique({
      where: { userId_companyId: { userId: betaUserId, companyId: acmeCompanyId } },
    })
    if (targetInAcme) throw new Error('Seed fixture failed: beta user unexpectedly has acme membership')
  })

  describe('Route preHandlers regression: missing / wrong context', () => {
    it('GET /v1/users without auth => 401', async () => {
      const { res } = await injectJson(app, { method: 'GET', url: '/v1/users' })
      expect(res.statusCode).toBe(401)
    })

    it('GET /v1/users/:id without auth => 401', async () => {
      const { res } = await injectJson(app, { method: 'GET', url: `/v1/users/${betaUserId}` })
      expect(res.statusCode).toBe(401)
    })

    it('POST /v1/users without auth => 401', async () => {
      const { res } = await injectJson(app, {
        method: 'POST',
        url: '/v1/users',
        headers: { 'content-type': 'application/json' },
        payload: {
          email: 'newuser-noauth@acme.test',
          password: 'password123',
          firstName: 'New',
          lastName: 'User',
          role: 'USER',
          isActive: true,
        },
      })
      expect(res.statusCode).toBe(401)
    })

    it('PUT /v1/users/:id without auth => 401', async () => {
      const { res } = await injectJson(app, {
        method: 'PUT',
        url: `/v1/users/${betaUserId}`,
        headers: { 'content-type': 'application/json' },
        payload: { firstName: 'Updated', isActive: true },
      })
      expect(res.statusCode).toBe(401)
    })

    it('DELETE /v1/users/:id without auth => 401', async () => {
      const { res } = await injectJson(app, { method: 'DELETE', url: `/v1/users/${betaUserId}` })
      expect(res.statusCode).toBe(401)
    })

    it('GET /v1/users without company context => 401', async () => {
      const { res } = await injectJson(app, {
        method: 'GET',
        url: '/v1/users',
        headers: { Authorization: `Bearer ${orphanUserToken}` },
      })
      expect(res.statusCode).toBe(401)
    })

    it('GET /v1/users/:id without company context => 401', async () => {
      const { res } = await injectJson(app, {
        method: 'GET',
        url: `/v1/users/${betaUserId}`,
        headers: { Authorization: `Bearer ${orphanUserToken}` },
      })
      expect(res.statusCode).toBe(401)
    })

    it('POST /v1/users without company context => 401', async () => {
      const { res } = await injectJson(app, {
        method: 'POST',
        url: '/v1/users',
        headers: { Authorization: `Bearer ${orphanUserToken}`, 'content-type': 'application/json' },
        payload: {
          email: 'newuser-orphan-context@acme.test',
          password: 'password123',
          firstName: 'New',
          lastName: 'User',
          role: 'USER',
          isActive: true,
        },
      })
      expect(res.statusCode).toBe(401)
    })

    it('PUT /v1/users/:id without company context => 401', async () => {
      const { res } = await injectJson(app, {
        method: 'PUT',
        url: `/v1/users/${betaUserId}`,
        headers: { Authorization: `Bearer ${orphanUserToken}`, 'content-type': 'application/json' },
        payload: { firstName: 'Updated', isActive: true },
      })
      expect(res.statusCode).toBe(401)
    })

    it('DELETE /v1/users/:id without company context => 401', async () => {
      const { res } = await injectJson(app, {
        method: 'DELETE',
        url: `/v1/users/${betaUserId}`,
        headers: { Authorization: `Bearer ${orphanUserToken}` },
      })
      expect(res.statusCode).toBe(401)
    })

    it('GET /v1/users with membershipRole=USER but JWT role=ADMIN => 403', async () => {
      const { res } = await injectJson(app, {
        method: 'GET',
        url: '/v1/users',
        headers: { Authorization: `Bearer ${acmeMembershipUserMismatchToken}` },
      })
      expect(res.statusCode).toBe(403)
    })

    it('GET /v1/users/:id with membershipRole=USER but JWT role=ADMIN => 403', async () => {
      const { res } = await injectJson(app, {
        method: 'GET',
        url: `/v1/users/${betaUserId}`,
        headers: { Authorization: `Bearer ${acmeMembershipUserMismatchToken}` },
      })
      expect(res.statusCode).toBe(403)
    })

    it('POST /v1/users with membershipRole=USER but JWT role=ADMIN => 403', async () => {
      const { res } = await injectJson(app, {
        method: 'POST',
        url: '/v1/users',
        headers: { Authorization: `Bearer ${acmeMembershipUserMismatchToken}`, 'content-type': 'application/json' },
        payload: {
          email: 'newuser-forbidden-role@acme.test',
          password: 'password123',
          firstName: 'New',
          lastName: 'User',
          role: 'USER',
          isActive: true,
        },
      })
      expect(res.statusCode).toBe(403)
    })

    it('PUT /v1/users/:id with membershipRole=USER but JWT role=ADMIN => 403', async () => {
      const { res } = await injectJson(app, {
        method: 'PUT',
        url: `/v1/users/${betaUserId}`,
        headers: { Authorization: `Bearer ${acmeMembershipUserMismatchToken}`, 'content-type': 'application/json' },
        payload: { firstName: 'Updated', isActive: true },
      })
      expect(res.statusCode).toBe(403)
    })

    it('DELETE /v1/users/:id with membershipRole=USER but JWT role=ADMIN => 403', async () => {
      const { res } = await injectJson(app, {
        method: 'DELETE',
        url: `/v1/users/${betaUserId}`,
        headers: { Authorization: `Bearer ${acmeMembershipUserMismatchToken}` },
      })
      expect(res.statusCode).toBe(403)
    })
  })

  describe('Service-layer membership regression: cross-tenant read/write/delete', () => {
    it('GET /v1/users/:id cross-tenant existing user => 403', async () => {
      const { res } = await injectJson(app, {
        method: 'GET',
        url: `/v1/users/${betaUserId}`,
        headers: { Authorization: `Bearer ${acmeOwnerToken}` },
      })
      expect(res.statusCode).toBe(403)
    })

    it('PUT /v1/users/:id cross-tenant existing user => 403 and no mutation', async () => {
      const before = await prisma.user.findUnique({
        where: { id: betaUserId },
        select: { email: true, firstName: true, lastName: true, role: true, isActive: true },
      })
      if (!before) throw new Error('Target beta user missing (expected seeded fixture)')

      const { res } = await injectJson(app, {
        method: 'PUT',
        url: `/v1/users/${betaUserId}`,
        headers: { Authorization: `Bearer ${acmeOwnerToken}`, 'content-type': 'application/json' },
        payload: {
          email: 'cross-tenant-update@betacorp.test',
          firstName: 'Nope',
          isActive: true,
          role: 'USER',
        },
      })
      expect(res.statusCode).toBe(403)

      const after = await prisma.user.findUnique({
        where: { id: betaUserId },
        select: { email: true, firstName: true, lastName: true, role: true, isActive: true },
      })
      expect(after).toEqual(before)
    })

    it('DELETE /v1/users/:id cross-tenant existing user => 403 and no deletion', async () => {
      const before = await prisma.user.findUnique({ where: { id: betaUserId }, select: { id: true } })
      if (!before) throw new Error('Target beta user missing (expected seeded fixture)')

      const { res } = await injectJson(app, {
        method: 'DELETE',
        url: `/v1/users/${betaUserId}`,
        headers: { Authorization: `Bearer ${acmeOwnerToken}` },
      })
      expect(res.statusCode).toBe(403)

      const after = await prisma.user.findUnique({ where: { id: betaUserId }, select: { id: true } })
      expect(after).toEqual(before)
    })

    it('GET /v1/users/:id cross-tenant non-existent id => 403 (avoid existence leak)', async () => {
      const missingId = randomUUID()
      const { res } = await injectJson(app, {
        method: 'GET',
        url: `/v1/users/${missingId}`,
        headers: { Authorization: `Bearer ${acmeOwnerToken}` },
      })
      expect(res.statusCode).toBe(403)
    })
  })

  describe('No cross-tenant leakage on list', () => {
    it('GET /v1/users returns only users from resolved companyId', async () => {
      const expectedUserIds = await prisma.companyMember.findMany({
        where: { companyId: acmeCompanyId },
        select: { userId: true },
      })
      const expectedIdsSet = new Set(expectedUserIds.map((x) => x.userId))

      const { res, json } = await injectJson(app, {
        method: 'GET',
        url: '/v1/users',
        headers: { Authorization: `Bearer ${acmeOwnerToken}` },
      })
      expect(res.statusCode).toBe(200)
      expect(json.success).toBe(true)

      const returnedIds = new Set((json.data as any[]).map((u) => u.id))
      // Orphan user should never appear (no company membership), but we created one in this test file.
      expect(returnedIds.size).toBeGreaterThan(0)
      for (const id of returnedIds) {
        expect(expectedIdsSet.has(id)).toBe(true)
      }
      // Beta users must never be visible.
      expect(returnedIds.has(betaUserId)).toBe(false)
      expect(json.data.some((u: any) => u.email === 'ventas@betacorp.com')).toBe(false)
    })
  })

  describe('Dynamic authorization boundaries (post-token changes)', () => {
    it('membership role upgrade USER -> OWNER is applied without re-login', async () => {
      await prisma.companyMember.update({
        where: { userId_companyId: { userId: acmeMembershipUserMismatchId, companyId: acmeCompanyId } },
        data: { membershipRole: 'OWNER' },
      })

      const { res } = await injectJson(app, {
        method: 'GET',
        url: '/v1/users',
        headers: { Authorization: `Bearer ${acmeMembershipUserMismatchToken}` },
      })
      expect(res.statusCode).toBe(200)

      await prisma.companyMember.update({
        where: { userId_companyId: { userId: acmeMembershipUserMismatchId, companyId: acmeCompanyId } },
        data: { membershipRole: 'USER' },
      })
    })

    it('company membership removal is applied without re-login', async () => {
      await prisma.companyMember.delete({
        where: { userId_companyId: { userId: acmeMembershipUserMismatchId, companyId: acmeCompanyId } },
      })

      const { res } = await injectJson(app, {
        method: 'GET',
        url: '/v1/users',
        headers: { Authorization: `Bearer ${acmeMembershipUserMismatchToken}` },
      })
      expect(res.statusCode).toBe(401)

      await prisma.companyMember.create({
        data: { userId: acmeMembershipUserMismatchId, companyId: acmeCompanyId, membershipRole: 'USER' },
      })
    })
  })
})

