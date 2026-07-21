/**
 * Integration tests — PLAN-22: GDPR account endpoints + security headers.
 *
 * Covers:
 *  - GET  /v1/account/my-data   (unauthenticated → 401; authenticated → 200 with shape)
 *  - POST /v1/account/accept-privacy (unauthenticated → 401; authenticated → 200 + timestamp)
 *  - DELETE /v1/account/my-data (unauthenticated → 401; sole owner → 403; valid → 200 + anonymized)
 *  - Security headers present on every response (HSTS, X-Content-Type-Options, X-Frame-Options, CSP)
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import type { FastifyInstance } from 'fastify'
import { prisma } from '@/db'

import './setup'
import { generateToken } from '../../core/auth.js'

async function inject(
  app: FastifyInstance,
  opts: Parameters<FastifyInstance['inject']>[0],
): Promise<{ res: Awaited<ReturnType<FastifyInstance['inject']>>; body: any }> {
  const res = await app.inject(opts)
  let body: any = null
  if (res.body) {
    try { body = res.json() } catch { body = res.body }
  }
  return { res, body }
}

describe('PLAN-22: GDPR account endpoints', () => {
  let app: FastifyInstance

  // ── Fixtures ──────────────────────────────────────────────────────────────

  // Regular user with a company membership (non-owner) — used for export / accept-privacy
  let regularUserId: string
  let regularToken: string

  // User who is sole OWNER of a company — must be blocked from self-deletion
  let soleOwnerUserId: string
  let soleOwnerToken: string

  // User who co-owns a company (another OWNER exists) — can self-anonymize
  let coOwnerUserId: string
  let coOwnerToken: string

  // Company shared by coOwner and another owner
  let sharedCompanyId: string

  beforeAll(async () => {
    const mod = await import('../../server.js')
    app = mod.default as FastifyInstance

    const pw = await bcrypt.hash('password123', 10)
    const suffix = randomUUID().slice(0, 8)

    // ── Regular user (member, not owner) ──────────────────────────────────
    const company = await prisma.company.create({
      data: { name: `GdprTestCompany-${suffix}` },
    })

    const regularUser = await prisma.user.create({
      data: {
        email: `gdpr-regular-${suffix}@test.local`,
        password: pw,
        firstName: 'Regular',
        lastName: 'User',
        role: 'USER',
        isActive: true,
      },
    })
    await prisma.companyMember.create({
      data: { userId: regularUser.id, companyId: company.id, membershipRole: 'USER' },
    })
    regularUserId = regularUser.id
    regularToken = generateToken({ id: regularUser.id, email: regularUser.email, role: regularUser.role, companyId: company.id })

    // ── Sole owner — blocked from anonymization ───────────────────────────
    const soleOwnerCompany = await prisma.company.create({
      data: { name: `SoleOwnerCompany-${suffix}` },
    })
    const soleOwner = await prisma.user.create({
      data: {
        email: `gdpr-sole-owner-${suffix}@test.local`,
        password: pw,
        firstName: 'Sole',
        lastName: 'Owner',
        role: 'USER',
        isActive: true,
      },
    })
    await prisma.companyMember.create({
      data: { userId: soleOwner.id, companyId: soleOwnerCompany.id, membershipRole: 'OWNER' },
    })
    soleOwnerUserId = soleOwner.id
    soleOwnerToken = generateToken({ id: soleOwner.id, email: soleOwner.email, role: soleOwner.role })

    // ── Co-owner (another owner also exists) — can be anonymized ─────────
    const sharedCompany = await prisma.company.create({
      data: { name: `SharedOwnerCompany-${suffix}` },
    })
    sharedCompanyId = sharedCompany.id

    const coOwner = await prisma.user.create({
      data: {
        email: `gdpr-co-owner-${suffix}@test.local`,
        password: pw,
        firstName: 'Co',
        lastName: 'Owner',
        role: 'USER',
        isActive: true,
      },
    })
    // Second owner of the same company
    const secondOwner = await prisma.user.create({
      data: {
        email: `gdpr-second-owner-${suffix}@test.local`,
        password: pw,
        firstName: 'Second',
        lastName: 'Owner',
        role: 'USER',
        isActive: true,
      },
    })
    await prisma.companyMember.createMany({
      data: [
        { userId: coOwner.id, companyId: sharedCompanyId, membershipRole: 'OWNER' },
        { userId: secondOwner.id, companyId: sharedCompanyId, membershipRole: 'OWNER' },
      ],
    })
    coOwnerUserId = coOwner.id
    coOwnerToken = generateToken({ id: coOwner.id, email: coOwner.email, role: coOwner.role })
  })

  // ── Unauthenticated access ────────────────────────────────────────────────

  describe('Unauthenticated access → 401', () => {
    it('GET /v1/account/my-data without token → 401', async () => {
      const { res } = await inject(app, { method: 'GET', url: '/v1/account/my-data' })
      expect(res.statusCode).toBe(401)
    })

    it('POST /v1/account/accept-privacy without token → 401', async () => {
      const { res } = await inject(app, { method: 'POST', url: '/v1/account/accept-privacy' })
      expect(res.statusCode).toBe(401)
    })

    it('DELETE /v1/account/my-data without token → 401', async () => {
      const { res } = await inject(app, { method: 'DELETE', url: '/v1/account/my-data' })
      expect(res.statusCode).toBe(401)
    })
  })

  // ── GET /v1/account/my-data ───────────────────────────────────────────────

  describe('GET /v1/account/my-data', () => {
    it('returns 200 with correct top-level shape', async () => {
      const { res, body } = await inject(app, {
        method: 'GET',
        url: '/v1/account/my-data',
        headers: { Authorization: `Bearer ${regularToken}` },
      })
      expect(res.statusCode).toBe(200)
      expect(body.success).toBe(true)
      const d = body.data
      expect(d.exportedAt).toBeDefined()
      expect(d.profile).toBeDefined()
      expect(d.memberships).toBeInstanceOf(Array)
      expect(d.preferences).toBeInstanceOf(Array)
      expect(d.auditLogs).toBeInstanceOf(Array)
      expect(d.recentSales).toBeInstanceOf(Array)
      expect(d.actionHistory).toBeInstanceOf(Array)
    })

    it('profile contains expected user fields', async () => {
      const { body } = await inject(app, {
        method: 'GET',
        url: '/v1/account/my-data',
        headers: { Authorization: `Bearer ${regularToken}` },
      })
      const { profile } = body.data
      expect(profile.id).toBe(regularUserId)
      expect(profile.email).toBeDefined()
      expect(profile.firstName).toBe('Regular')
      expect(profile.lastName).toBe('User')
    })

    it('profile does NOT expose password or twoFactorSecret', async () => {
      const { body } = await inject(app, {
        method: 'GET',
        url: '/v1/account/my-data',
        headers: { Authorization: `Bearer ${regularToken}` },
      })
      const { profile } = body.data
      expect(profile.password).toBeUndefined()
      expect(profile.twoFactorSecret).toBeUndefined()
    })

    it('response includes Content-Disposition attachment header', async () => {
      const { res } = await inject(app, {
        method: 'GET',
        url: '/v1/account/my-data',
        headers: { Authorization: `Bearer ${regularToken}` },
      })
      expect(String(res.headers['content-disposition'] ?? '')).toContain('attachment')
    })

  })

  // ── POST /v1/account/accept-privacy ──────────────────────────────────────

  describe('POST /v1/account/accept-privacy', () => {
    it('returns 200 and a privacyAcceptedAt timestamp', async () => {
      const { res, body } = await inject(app, {
        method: 'POST',
        url: '/v1/account/accept-privacy',
        headers: { Authorization: `Bearer ${regularToken}` },
      })
      expect(res.statusCode).toBe(200)
      expect(body.success).toBe(true)
      expect(body.data.privacyAcceptedAt).toBeDefined()
    })

    it('persists privacyAcceptedAt in the database', async () => {
      await inject(app, {
        method: 'POST',
        url: '/v1/account/accept-privacy',
        headers: { Authorization: `Bearer ${regularToken}` },
      })
      const user = await prisma.user.findUnique({
        where: { id: regularUserId },
        select: { privacyAcceptedAt: true },
      })
      expect(user?.privacyAcceptedAt).not.toBeNull()
    })
  })

  // ── DELETE /v1/account/my-data ────────────────────────────────────────────

  describe('DELETE /v1/account/my-data — sole owner blocked', () => {
    it('returns 403 when user is the only owner of a company', async () => {
      const { res } = await inject(app, {
        method: 'DELETE',
        url: '/v1/account/my-data',
        headers: { Authorization: `Bearer ${soleOwnerToken}` },
      })
      expect(res.statusCode).toBe(403)
    })

    it('sole owner user row is NOT modified after blocked request', async () => {
      const before = await prisma.user.findUnique({
        where: { id: soleOwnerUserId },
        select: { email: true, isActive: true },
      })
      await inject(app, {
        method: 'DELETE',
        url: '/v1/account/my-data',
        headers: { Authorization: `Bearer ${soleOwnerToken}` },
      })
      const after = await prisma.user.findUnique({
        where: { id: soleOwnerUserId },
        select: { email: true, isActive: true },
      })
      expect(after).toEqual(before)
    })
  })

  describe('DELETE /v1/account/my-data — co-owner succeeds', () => {
    it('returns 200 with anonymized=true', async () => {
      const { res, body } = await inject(app, {
        method: 'DELETE',
        url: '/v1/account/my-data',
        headers: { Authorization: `Bearer ${coOwnerToken}` },
      })
      expect(res.statusCode).toBe(200)
      expect(body.success).toBe(true)
      expect(body.data.anonymized).toBe(true)
    })

    it('anonymizes PII fields in the database after deletion', async () => {
      const user = await prisma.user.findUnique({
        where: { id: coOwnerUserId },
        select: { email: true, firstName: true, lastName: true, isActive: true },
      })
      expect(user?.email).toMatch(/^deleted_.*@deleted\.local$/)
      expect(user?.firstName).toBe('[Eliminado]')
      expect(user?.lastName).toBe('[Eliminado]')
      expect(user?.isActive).toBe(false)
    })

    it('user cannot re-authenticate after anonymization (account inactive)', async () => {
      const user = await prisma.user.findUnique({
        where: { id: coOwnerUserId },
        select: { isActive: true },
      })
      expect(user?.isActive).toBe(false)
    })
  })

  // ── Security headers ──────────────────────────────────────────────────────

  describe('Security headers (Fase 3)', () => {
    it('every response includes Strict-Transport-Security', async () => {
      const { res } = await inject(app, {
        method: 'GET',
        url: '/v1/account/my-data',
        headers: { Authorization: `Bearer ${regularToken}` },
      })
      const hsts = String(res.headers['strict-transport-security'] ?? '')
      expect(hsts).toContain('max-age=')
      expect(hsts).toContain('includeSubDomains')
    })

    it('every response includes X-Content-Type-Options: nosniff', async () => {
      const { res } = await inject(app, {
        method: 'GET',
        url: '/v1/account/my-data',
        headers: { Authorization: `Bearer ${regularToken}` },
      })
      expect(res.headers['x-content-type-options']).toBe('nosniff')
    })

    it('every response includes X-Frame-Options: DENY', async () => {
      const { res } = await inject(app, {
        method: 'GET',
        url: '/v1/account/my-data',
        headers: { Authorization: `Bearer ${regularToken}` },
      })
      expect(res.headers['x-frame-options']).toBe('DENY')
    })

    it('every response includes Content-Security-Policy', async () => {
      const { res } = await inject(app, {
        method: 'GET',
        url: '/v1/account/my-data',
        headers: { Authorization: `Bearer ${regularToken}` },
      })
      expect(res.headers['content-security-policy']).toBeDefined()
    })

    it('security headers are also present on 401 responses', async () => {
      const { res } = await inject(app, { method: 'GET', url: '/v1/account/my-data' })
      expect(res.statusCode).toBe(401)
      expect(res.headers['x-content-type-options']).toBe('nosniff')
    })
  })
})
