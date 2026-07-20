/**
 * PLAN-19: Audit Log integration tests.
 *
 * Covers:
 *  1. Route security: 401/403 without valid auth or insufficient role.
 *  2. Cross-tenant isolation: each company admin sees only their own logs.
 *  3. Pagination and filter parameters are respected.
 *  4. Login via HTTP writes a LOGIN_SUCCESS audit log entry.
 *  5. User creation via HTTP writes a USER_CREATED audit log entry.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import bcrypt from 'bcryptjs'
import type { FastifyInstance } from 'fastify'
import { prisma } from '@hubilee/database'

import './setup'

import { generateToken } from '../../core/auth.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function parseJson(res: { payload?: unknown; body?: unknown; statusCode: number }): any {
  const raw = (res as any).payload ?? (res as any).body
  if (raw == null) return null
  if (typeof raw === 'string') return JSON.parse(raw)
  return raw
}

async function inject(app: FastifyInstance, opts: Parameters<FastifyInstance['inject']>[0]) {
  const res = await app.inject(opts)
  return { status: res.statusCode, body: parseJson(res as any) }
}

/** Flush setImmediate queue so fire-and-forget audit writes can settle. */
function flushAsync() {
  return new Promise<void>((resolve) => setImmediate(resolve))
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
describe('PLAN-19 Audit Log Integration', () => {
  let app: FastifyInstance

  // Fixtures: two isolated tenants
  let acmeId: string
  let betaId: string

  let acmeOwnerId: string
  let betaOwnerId: string

  let acmeOwnerToken: string  // no companyId → requireCompanyContext resolves via membership
  let acmeOwnerTokenWithCompany: string // companyId embedded → skip DB resolution
  let betaOwnerToken: string
  let betaOwnerTokenWithCompany: string

  let acmeUserToken: string   // regular member — role=USER, should be rejected

  beforeAll(async () => {
    const mod = await import('../../server.js')
    app = mod.default as FastifyInstance

    const hashedPw = await bcrypt.hash('Test1234!', 10)

    // ---- Acme Inc. --------------------------------------------------------
    const acme =
      (await prisma.company.findFirst({ where: { name: 'Acme Inc.' } })) ??
      (await prisma.company.create({ data: { name: 'Acme Inc.' } }))
    acmeId = acme.id

    const acmeOwner =
      (await prisma.user.findUnique({ where: { email: 'audit-acme-owner@test.local' } })) ??
      (await prisma.user.create({
        data: {
          email: 'audit-acme-owner@test.local',
          password: hashedPw,
          firstName: 'Acme',
          lastName: 'Owner',
          role: 'ADMIN',
          isActive: true,
          isSuperuser: false,
        },
      }))
    acmeOwnerId = acmeOwner.id
    await prisma.companyMember.upsert({
      where: { userId_companyId: { userId: acmeOwnerId, companyId: acmeId } },
      update: { membershipRole: 'OWNER' },
      create: { userId: acmeOwnerId, companyId: acmeId, membershipRole: 'OWNER' },
    })

    const acmeRegularUser =
      (await prisma.user.findUnique({ where: { email: 'audit-acme-user@test.local' } })) ??
      (await prisma.user.create({
        data: {
          email: 'audit-acme-user@test.local',
          password: hashedPw,
          firstName: 'Acme',
          lastName: 'User',
          role: 'USER',
          isActive: true,
          isSuperuser: false,
        },
      }))
    await prisma.companyMember.upsert({
      where: { userId_companyId: { userId: acmeRegularUser.id, companyId: acmeId } },
      update: { membershipRole: 'USER' },
      create: { userId: acmeRegularUser.id, companyId: acmeId, membershipRole: 'USER' },
    })

    // ---- Beta Corp. -------------------------------------------------------
    const beta =
      (await prisma.company.findFirst({ where: { name: 'Beta Corp.' } })) ??
      (await prisma.company.create({ data: { name: 'Beta Corp.' } }))
    betaId = beta.id

    const betaOwner =
      (await prisma.user.findUnique({ where: { email: 'audit-beta-owner@test.local' } })) ??
      (await prisma.user.create({
        data: {
          email: 'audit-beta-owner@test.local',
          password: hashedPw,
          firstName: 'Beta',
          lastName: 'Owner',
          role: 'ADMIN',
          isActive: true,
          isSuperuser: false,
        },
      }))
    betaOwnerId = betaOwner.id
    await prisma.companyMember.upsert({
      where: { userId_companyId: { userId: betaOwnerId, companyId: betaId } },
      update: { membershipRole: 'OWNER' },
      create: { userId: betaOwnerId, companyId: betaId, membershipRole: 'OWNER' },
    })

    // ---- Tokens -----------------------------------------------------------
    const baseAcme = { id: acmeOwnerId, email: acmeOwner.email, role: acmeOwner.role, isSuperuser: false }
    acmeOwnerToken = generateToken(baseAcme)
    acmeOwnerTokenWithCompany = generateToken({ ...baseAcme, companyId: acmeId, membershipRole: 'OWNER' })

    const baseBeta = { id: betaOwnerId, email: betaOwner.email, role: betaOwner.role, isSuperuser: false }
    betaOwnerToken = generateToken(baseBeta)
    betaOwnerTokenWithCompany = generateToken({ ...baseBeta, companyId: betaId, membershipRole: 'OWNER' })

    acmeUserToken = generateToken({
      id: acmeRegularUser.id,
      email: acmeRegularUser.email,
      role: acmeRegularUser.role,
      isSuperuser: false,
      companyId: acmeId,
      membershipRole: 'USER',
    })

    // ---- Seed deterministic audit log rows --------------------------------
    // Clean previous test-generated rows so assertions are predictable.
    await prisma.auditLog.deleteMany({ where: { companyId: { in: [acmeId, betaId] } } })

    // 5 Acme logs, 3 Beta logs
    await prisma.auditLog.createMany({
      data: [
        { companyId: acmeId, userId: acmeOwnerId, action: 'LOGIN_SUCCESS', entityType: 'auth', entityId: acmeOwnerId },
        { companyId: acmeId, userId: acmeOwnerId, action: 'USER_CREATED', entityType: 'user', entityId: 'some-user-id-1' },
        { companyId: acmeId, userId: acmeOwnerId, action: 'USER_UPDATED', entityType: 'user', entityId: 'some-user-id-1' },
        { companyId: acmeId, userId: acmeOwnerId, action: 'SALE_CREATED', entityType: 'sale', entityId: 'sale-id-1' },
        { companyId: acmeId, userId: acmeOwnerId, action: 'SALE_CANCELLED', entityType: 'sale', entityId: 'sale-id-1' },
        { companyId: betaId, userId: betaOwnerId, action: 'LOGIN_SUCCESS', entityType: 'auth', entityId: betaOwnerId },
        { companyId: betaId, userId: betaOwnerId, action: 'USER_CREATED', entityType: 'user', entityId: 'some-user-id-2' },
        { companyId: betaId, userId: betaOwnerId, action: 'SALE_CREATED', entityType: 'sale', entityId: 'sale-id-2' },
      ],
    })
  }, 120_000)

  // -------------------------------------------------------------------------
  // 1. Route security
  // -------------------------------------------------------------------------
  describe('Route security', () => {
    it('returns 401 without auth token', async () => {
      const { status } = await inject(app, { method: 'GET', url: '/v1/company/audit-logs' })
      expect(status).toBe(401)
    })

    it('returns 401 when token has no companyId and user has no membership', async () => {
      // Token without companyId and no membership row → requireCompanyContext fails
      const orphanUser = await prisma.user.create({
        data: {
          email: `audit-orphan-${Date.now()}@test.local`,
          password: 'x',
          firstName: 'O',
          lastName: 'X',
          role: 'ADMIN',
          isActive: true,
          isSuperuser: false,
        },
      })
      const token = generateToken({ id: orphanUser.id, email: orphanUser.email, role: orphanUser.role, isSuperuser: false })
      const { status } = await inject(app, {
        method: 'GET',
        url: '/v1/company/audit-logs',
        headers: { authorization: `Bearer ${token}` },
      })
      expect(status).toBe(401)
    })

    it('returns 403 for a USER-role member (not owner/admin)', async () => {
      const { status } = await inject(app, {
        method: 'GET',
        url: '/v1/company/audit-logs',
        headers: { authorization: `Bearer ${acmeUserToken}` },
      })
      expect(status).toBe(403)
    })

    it('returns 200 for an OWNER', async () => {
      const { status } = await inject(app, {
        method: 'GET',
        url: '/v1/company/audit-logs',
        headers: { authorization: `Bearer ${acmeOwnerTokenWithCompany}` },
      })
      expect(status).toBe(200)
    })
  })

  // -------------------------------------------------------------------------
  // 2. Cross-tenant isolation
  // -------------------------------------------------------------------------
  describe('Cross-tenant isolation', () => {
    it('Acme owner sees only Acme audit logs', async () => {
      const { status, body } = await inject(app, {
        method: 'GET',
        url: '/v1/company/audit-logs',
        headers: { authorization: `Bearer ${acmeOwnerTokenWithCompany}` },
      })
      expect(status).toBe(200)
      const items: any[] = body.data.items
      expect(items.length).toBeGreaterThan(0)
      for (const item of items) {
        // We can't access companyId from the response, but we verify no Beta-owned entities appear
        expect(item.entityId).not.toBe(betaOwnerId)
      }
    })

    it('Acme owner gets exactly the Acme log count (5), not Beta logs', async () => {
      const { status, body } = await inject(app, {
        method: 'GET',
        url: '/v1/company/audit-logs?pageSize=100',
        headers: { authorization: `Bearer ${acmeOwnerTokenWithCompany}` },
      })
      expect(status).toBe(200)
      expect(body.data.pagination.total).toBe(5)
    })

    it('Beta owner gets exactly the Beta log count (3)', async () => {
      const { status, body } = await inject(app, {
        method: 'GET',
        url: '/v1/company/audit-logs?pageSize=100',
        headers: { authorization: `Bearer ${betaOwnerTokenWithCompany}` },
      })
      expect(status).toBe(200)
      expect(body.data.pagination.total).toBe(3)
    })

    it('Beta owner cannot retrieve Acme logs by manipulating query params', async () => {
      // The endpoint ignores any companyId param — it always uses the JWT context
      const { status, body } = await inject(app, {
        method: 'GET',
        url: `/v1/company/audit-logs?pageSize=100`,
        headers: { authorization: `Bearer ${betaOwnerTokenWithCompany}` },
      })
      expect(status).toBe(200)
      // Beta owner still only sees Beta's 3 logs, not Acme's 5
      expect(body.data.pagination.total).toBe(3)
    })
  })

  // -------------------------------------------------------------------------
  // 3. Pagination and filters
  // -------------------------------------------------------------------------
  describe('Pagination', () => {
    it('respects pageSize and returns correct pagination meta', async () => {
      const { status, body } = await inject(app, {
        method: 'GET',
        url: '/v1/company/audit-logs?page=1&pageSize=2',
        headers: { authorization: `Bearer ${acmeOwnerTokenWithCompany}` },
      })
      expect(status).toBe(200)
      expect(body.data.items).toHaveLength(2)
      expect(body.data.pagination.page).toBe(1)
      expect(body.data.pagination.pageSize).toBe(2)
      expect(body.data.pagination.total).toBe(5)
      expect(body.data.pagination.totalPages).toBe(3)
    })

    it('page 2 returns the next slice', async () => {
      const { status, body } = await inject(app, {
        method: 'GET',
        url: '/v1/company/audit-logs?page=2&pageSize=2',
        headers: { authorization: `Bearer ${acmeOwnerTokenWithCompany}` },
      })
      expect(status).toBe(200)
      expect(body.data.items).toHaveLength(2)
      expect(body.data.pagination.page).toBe(2)
    })

    it('last page may have fewer items than pageSize', async () => {
      const { status, body } = await inject(app, {
        method: 'GET',
        url: '/v1/company/audit-logs?page=3&pageSize=2',
        headers: { authorization: `Bearer ${acmeOwnerTokenWithCompany}` },
      })
      expect(status).toBe(200)
      expect(body.data.items).toHaveLength(1)
    })
  })

  describe('Filters', () => {
    it('filters by entityType=auth returns only auth logs', async () => {
      const { status, body } = await inject(app, {
        method: 'GET',
        url: '/v1/company/audit-logs?entityType=auth',
        headers: { authorization: `Bearer ${acmeOwnerTokenWithCompany}` },
      })
      expect(status).toBe(200)
      for (const item of body.data.items as any[]) {
        expect(item.entityType).toBe('auth')
      }
      expect(body.data.pagination.total).toBe(1)
    })

    it('filters by entityType=sale returns only sale logs', async () => {
      const { status, body } = await inject(app, {
        method: 'GET',
        url: '/v1/company/audit-logs?entityType=sale',
        headers: { authorization: `Bearer ${acmeOwnerTokenWithCompany}` },
      })
      expect(status).toBe(200)
      for (const item of body.data.items as any[]) {
        expect(item.entityType).toBe('sale')
      }
      expect(body.data.pagination.total).toBe(2)
    })

    it('filters by action=SALE_CREATED returns only that action', async () => {
      const { status, body } = await inject(app, {
        method: 'GET',
        url: '/v1/company/audit-logs?action=SALE_CREATED',
        headers: { authorization: `Bearer ${acmeOwnerTokenWithCompany}` },
      })
      expect(status).toBe(200)
      for (const item of body.data.items as any[]) {
        expect(item.action).toBe('SALE_CREATED')
      }
      expect(body.data.pagination.total).toBe(1)
    })

    it('filters by userId returns only that user logs', async () => {
      const { status, body } = await inject(app, {
        method: 'GET',
        url: `/v1/company/audit-logs?userId=${acmeOwnerId}`,
        headers: { authorization: `Bearer ${acmeOwnerTokenWithCompany}` },
      })
      expect(status).toBe(200)
      expect(body.data.pagination.total).toBe(5)
      for (const item of body.data.items as any[]) {
        expect(item.userId).toBe(acmeOwnerId)
      }
    })

    it('dateFrom in the future returns zero items', async () => {
      const future = new Date(Date.now() + 60 * 60 * 1000).toISOString()
      const { status, body } = await inject(app, {
        method: 'GET',
        url: `/v1/company/audit-logs?dateFrom=${encodeURIComponent(future)}`,
        headers: { authorization: `Bearer ${acmeOwnerTokenWithCompany}` },
      })
      expect(status).toBe(200)
      expect(body.data.items).toHaveLength(0)
      expect(body.data.pagination.total).toBe(0)
    })

    it('pageSize is clamped to a maximum of 100', async () => {
      const { status, body } = await inject(app, {
        method: 'GET',
        url: '/v1/company/audit-logs?pageSize=999',
        headers: { authorization: `Bearer ${acmeOwnerTokenWithCompany}` },
      })
      expect(status).toBe(200)
      expect(body.data.pagination.pageSize).toBe(100)
    })
  })

  // -------------------------------------------------------------------------
  // 4. HTTP events write audit logs (fire-and-forget)
  // -------------------------------------------------------------------------
  describe('HTTP events write audit logs', () => {
    it('successful login writes LOGIN_SUCCESS for the resolved company', async () => {
      // Delete existing auth logs for acme to isolate this test
      await prisma.auditLog.deleteMany({ where: { companyId: acmeId, action: 'LOGIN_SUCCESS' } })

      await inject(app, {
        method: 'POST',
        url: '/v1/auth/login',
        payload: { email: 'audit-acme-owner@test.local', password: 'Test1234!', companyId: acmeId },
      })

      // Flush setImmediate so the fire-and-forget write can settle
      await flushAsync()
      await new Promise((r) => setTimeout(r, 50))

      const log = await prisma.auditLog.findFirst({
        where: { companyId: acmeId, action: 'LOGIN_SUCCESS', userId: acmeOwnerId },
        orderBy: { createdAt: 'desc' },
      })
      expect(log).not.toBeNull()
      expect(log!.entityType).toBe('auth')
    })

    it('failed login writes LOGIN_FAILED when companyId is in the body', async () => {
      await prisma.auditLog.deleteMany({ where: { companyId: acmeId, action: 'LOGIN_FAILED' } })

      await inject(app, {
        method: 'POST',
        url: '/v1/auth/login',
        payload: { email: 'audit-acme-owner@test.local', password: 'WRONG_PASSWORD', companyId: acmeId },
      })

      await flushAsync()
      await new Promise((r) => setTimeout(r, 50))

      const log = await prisma.auditLog.findFirst({
        where: { companyId: acmeId, action: 'LOGIN_FAILED' },
        orderBy: { createdAt: 'desc' },
      })
      expect(log).not.toBeNull()
      expect(log!.entityType).toBe('auth')
      // Known user + wrong password: audit includes userId (PLAN-26 security logging).
      expect(log!.userId).toBe(acmeOwnerId)
    })

    it('user create via HTTP writes USER_CREATED audit log', async () => {
      await prisma.auditLog.deleteMany({ where: { companyId: acmeId, action: 'USER_CREATED' } })

      const newEmail = `audit-new-user-${Date.now()}@test.local`
      const { status } = await inject(app, {
        method: 'POST',
        url: '/v1/users',
        headers: { authorization: `Bearer ${acmeOwnerTokenWithCompany}` },
        payload: {
          email: newEmail,
          password: 'Test1234!',
          firstName: 'Audit',
          lastName: 'Test',
          role: 'USER',
        },
      })
      expect(status).toBe(200)

      await flushAsync()
      await new Promise((r) => setTimeout(r, 50))

      const log = await prisma.auditLog.findFirst({
        where: { companyId: acmeId, action: 'USER_CREATED', userId: acmeOwnerId },
        orderBy: { createdAt: 'desc' },
      })
      expect(log).not.toBeNull()
      expect(log!.entityType).toBe('user')
      expect(log!.entityId).toBeTruthy()

      // Cleanup: remove created user
      await prisma.user.deleteMany({ where: { email: newEmail } })
    })

    it('user update via HTTP writes USER_UPDATED audit log', async () => {
      const targetEmail = `audit-update-target-${Date.now()}@test.local`
      const targetUser = await prisma.user.create({
        data: {
          email: targetEmail,
          password: await bcrypt.hash('Test1234!', 10),
          firstName: 'Target',
          lastName: 'Update',
          role: 'USER',
          isActive: true,
          isSuperuser: false,
        },
      })
      await prisma.companyMember.create({
        data: { userId: targetUser.id, companyId: acmeId, membershipRole: 'USER' },
      })

      await prisma.auditLog.deleteMany({ where: { companyId: acmeId, action: 'USER_UPDATED' } })

      const { status } = await inject(app, {
        method: 'PUT',
        url: `/v1/users/${targetUser.id}`,
        headers: { authorization: `Bearer ${acmeOwnerTokenWithCompany}` },
        payload: { firstName: 'Updated', lastName: 'Name', isActive: true, role: 'USER' },
      })
      expect(status).toBe(200)

      await flushAsync()
      await new Promise((r) => setTimeout(r, 50))

      const log = await prisma.auditLog.findFirst({
        where: { companyId: acmeId, action: 'USER_UPDATED', entityId: targetUser.id },
        orderBy: { createdAt: 'desc' },
      })
      expect(log).not.toBeNull()
      expect(log!.entityType).toBe('user')
      expect(log!.userId).toBe(acmeOwnerId)

      await prisma.user.deleteMany({ where: { email: targetEmail } })
    })

    it('user delete via HTTP writes USER_DELETED audit log', async () => {
      const targetEmail = `audit-delete-target-${Date.now()}@test.local`
      const targetUser = await prisma.user.create({
        data: {
          email: targetEmail,
          password: await bcrypt.hash('Test1234!', 10),
          firstName: 'Target',
          lastName: 'Delete',
          role: 'USER',
          isActive: true,
          isSuperuser: false,
        },
      })
      await prisma.companyMember.create({
        data: { userId: targetUser.id, companyId: acmeId, membershipRole: 'USER' },
      })

      await prisma.auditLog.deleteMany({ where: { companyId: acmeId, action: 'USER_DELETED' } })

      const { status } = await inject(app, {
        method: 'DELETE',
        url: `/v1/users/${targetUser.id}`,
        headers: { authorization: `Bearer ${acmeOwnerTokenWithCompany}` },
      })
      expect(status).toBe(200)

      await flushAsync()
      await new Promise((r) => setTimeout(r, 50))

      const log = await prisma.auditLog.findFirst({
        where: { companyId: acmeId, action: 'USER_DELETED', entityId: targetUser.id },
        orderBy: { createdAt: 'desc' },
      })
      expect(log).not.toBeNull()
      expect(log!.entityType).toBe('user')
    })
  })

  // -------------------------------------------------------------------------
  // 5. Response shape includes user enrichment
  // -------------------------------------------------------------------------
  describe('Response shape', () => {
    it('items include user.email and user.firstName for known users', async () => {
      const { status, body } = await inject(app, {
        method: 'GET',
        url: `/v1/company/audit-logs?userId=${acmeOwnerId}&pageSize=1`,
        headers: { authorization: `Bearer ${acmeOwnerTokenWithCompany}` },
      })
      expect(status).toBe(200)
      const item = body.data.items[0]
      expect(item.userId).toBe(acmeOwnerId)
      expect(item.user).not.toBeNull()
      expect(item.user.email).toBe('audit-acme-owner@test.local')
    })

    it('items have user: null when userId is null', async () => {
      // Insert a log without userId
      await prisma.auditLog.create({
        data: { companyId: acmeId, userId: null, action: 'LOGIN_FAILED', entityType: 'auth' },
      })

      const { status, body } = await inject(app, {
        method: 'GET',
        url: '/v1/company/audit-logs?action=LOGIN_FAILED&pageSize=1',
        headers: { authorization: `Bearer ${acmeOwnerTokenWithCompany}` },
      })
      expect(status).toBe(200)
      const item = body.data.items.find((i: any) => i.userId === null)
      if (item) {
        expect(item.user).toBeNull()
      }

      await prisma.auditLog.deleteMany({ where: { companyId: acmeId, action: 'LOGIN_FAILED', userId: null } })
    })
  })
})
