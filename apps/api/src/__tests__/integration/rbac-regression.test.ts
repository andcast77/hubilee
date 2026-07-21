/**
 * PLAN-18: RBAC regression tests.
 *
 * Covers:
 * 1. Cross-tenant isolation — user from Acme cannot manage Acme RBAC resources via Beta's companyId.
 * 2. Privilege escalation prevention — a USER cannot assign roles to themselves.
 * 3. requirePermission deny-by-default — a USER without any role/permission for an action gets 403.
 * 4. Nivel 2 — a member with pos disabled in CompanyMemberModule gets 403 even if company has module.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { prisma } from '@/db'
import { Buffer } from 'node:buffer'
import bcrypt from 'bcryptjs'

import './setup'

import { generateToken } from '../../core/auth.js'

type InjectResult = {
  statusCode: number
  payload: unknown
}

function getJsonPayload(res: InjectResult | any): any {
  const payload = res.payload ?? res.body
  if (payload == null) return null
  if (typeof payload === 'string') {
    try { return JSON.parse(payload) } catch { return payload }
  }
  if (Buffer.isBuffer(payload)) return JSON.parse(payload.toString('utf8'))
  if (payload instanceof Uint8Array) return JSON.parse(Buffer.from(payload).toString('utf8'))
  if (typeof payload === 'object') return payload
  return JSON.parse(String(payload))
}

async function inject(app: FastifyInstance, opts: any) {
  const res = await app.inject(opts)
  return { res: res as unknown as InjectResult, json: getJsonPayload(res as unknown as InjectResult) }
}

describe('PLAN-18: RBAC Regression', () => {
  let app: FastifyInstance

  let acmeCompanyId: string
  let betaCompanyId: string
  let acmeMemberId: string        // CompanyMember.id for acmeVentas in Acme
  let acmeUserUserId: string      // User.id for acmeVentas

  let acmeOwnerToken: string
  let acmeUserToken: string
  let betaUserToken: string

  beforeAll(async () => {
    const mod = await import('../../server.js')
    app = mod.default as FastifyInstance

    const acme = await prisma.company.findFirst({ where: { name: 'Acme Inc.' } })
    const beta = await prisma.company.findFirst({ where: { name: 'Beta Corp.' } })
    if (!acme || !beta) throw new Error('Missing seeded companies')
    acmeCompanyId = acme.id
    betaCompanyId = beta.id

    const acmeOwnerUser = await prisma.user.findUnique({ where: { email: 'gerente@acme.com' } })
    const acmeVentasUser = await prisma.user.findUnique({ where: { email: 'ventas@acme.com' } })
    if (!acmeOwnerUser || !acmeVentasUser) throw new Error('Missing seeded Acme users')
    acmeUserUserId = acmeVentasUser.id

    const acmeMember = await prisma.companyMember.findFirst({
      where: { userId: acmeVentasUser.id, companyId: acmeCompanyId },
      select: { id: true },
    })
    if (!acmeMember) throw new Error('Missing CompanyMember for acmeVentas in Acme')
    acmeMemberId = acmeMember.id

    // Tokens include companyId and membershipRole to simulate the real auth flow (post context-switch).
    // Real tokens are issued with membershipRole so service-level policy checks (assertCanManageMembers) work correctly.
    acmeOwnerToken = generateToken({
      id: acmeOwnerUser.id,
      email: acmeOwnerUser.email,
      role: acmeOwnerUser.role,
      isSuperuser: acmeOwnerUser.isSuperuser,
      companyId: acmeCompanyId,
      membershipRole: 'OWNER',
    })

    acmeUserToken = generateToken({
      id: acmeVentasUser.id,
      email: acmeVentasUser.email,
      role: acmeVentasUser.role,
      isSuperuser: acmeVentasUser.isSuperuser,
      companyId: acmeCompanyId,
      membershipRole: 'USER',
    })

    // Beta company user (seeded as gerente@betacorp.com)
    const betaUser = await prisma.user.findUnique({ where: { email: 'gerente@betacorp.com' } })
    if (!betaUser) throw new Error('Missing seeded Beta user')
    betaUserToken = generateToken({
      id: betaUser.id,
      email: betaUser.email,
      role: betaUser.role,
      isSuperuser: betaUser.isSuperuser,
      companyId: betaCompanyId,
      membershipRole: 'OWNER',
    })
  }, 30_000)

  // ---------------------------------------------------------------------------
  // 1. Cross-tenant: Beta user cannot read/write Acme member modules/roles
  // ---------------------------------------------------------------------------

  it('Beta user cannot read Acme member modules (cross-tenant)', async () => {
    const { res } = await inject(app, {
      method: 'GET',
      url: `/v1/companies/${acmeCompanyId}/members/${acmeMemberId}/modules`,
      headers: { Authorization: `Bearer ${betaUserToken}` },
    })
    expect(res.statusCode).toBe(403)
  })

  it('Beta user cannot update Acme member modules (cross-tenant)', async () => {
    const { res } = await inject(app, {
      method: 'PUT',
      url: `/v1/companies/${acmeCompanyId}/members/${acmeMemberId}/modules`,
      headers: {
        Authorization: `Bearer ${betaUserToken}`,
        'content-type': 'application/json',
      },
      // Non-empty payload passes schema validation so the service assertCompanyAccess can block with 403
      // Valid RFC-4122 UUID (Zod 4 uuid() rejects nil / invalid variant bytes used previously)
      payload: { modules: [{ moduleId: '550e8400-e29b-41d4-a716-446655440001', enabled: true }] },
    })
    expect(res.statusCode).toBe(403)
  })

  it('Beta user cannot read Acme member roles (cross-tenant)', async () => {
    const { res } = await inject(app, {
      method: 'GET',
      url: `/v1/companies/${acmeCompanyId}/members/${acmeMemberId}/roles`,
      headers: { Authorization: `Bearer ${betaUserToken}` },
    })
    expect(res.statusCode).toBe(403)
  })

  it('Beta user cannot update Acme member roles (cross-tenant)', async () => {
    const { res } = await inject(app, {
      method: 'PUT',
      url: `/v1/companies/${acmeCompanyId}/members/${acmeMemberId}/roles`,
      headers: {
        Authorization: `Bearer ${betaUserToken}`,
        'content-type': 'application/json',
      },
      payload: { roleIds: [] },
    })
    expect(res.statusCode).toBe(403)
  })

  // ---------------------------------------------------------------------------
  // 2. Privilege escalation: USER cannot assign roles to themselves
  // ---------------------------------------------------------------------------

  it('USER cannot update their own roles (privilege escalation)', async () => {
    const { res, json } = await inject(app, {
      method: 'PUT',
      url: `/v1/companies/${acmeCompanyId}/members/${acmeMemberId}/roles`,
      headers: {
        Authorization: `Bearer ${acmeUserToken}`,
        'content-type': 'application/json',
      },
      payload: { roleIds: [] },
    })
    // USER role is not OWNER/ADMIN → requireRole guard blocks at 403
    expect(res.statusCode).toBe(403)
  })

  // ---------------------------------------------------------------------------
  // 3. requirePermission deny-by-default
  //    A USER with only Vendedor-shaped permissions (pos.sales.create, no
  //    cancel — FIX 5 grants pos.sales.cancel to Cajero only, NOT Vendedor)
  //    gets 403 canceling a sale. acmeVentas itself is no longer usable here:
  //    it holds the real seeded Cajero role, which (as of FIX 5) DOES include
  //    pos.sales.cancel, so it would incorrectly pass this deny-by-default check.
  // ---------------------------------------------------------------------------

  it('USER without cancel permission gets 403 on sale cancel (deny-by-default)', async () => {
    const vendedorEmail = `vendedor-deny-cancel-${Date.now()}@authz.test`
    const vendedorUser = await prisma.user.create({
      data: {
        email: vendedorEmail,
        password: await bcrypt.hash('password123', 10),
        firstName: 'Vendedor',
        lastName: 'DenyCancelTest',
        role: 'USER',
        isActive: true,
        isSuperuser: false,
      },
    })
    await prisma.companyMember.create({
      data: { userId: vendedorUser.id, companyId: acmeCompanyId, membershipRole: 'USER' },
    })
    const createPerm = await prisma.permission.upsert({
      where: { name: 'pos.sales.create' },
      create: { name: 'pos.sales.create', resource: 'pos.sales', action: 'create' },
      update: { resource: 'pos.sales', action: 'create' },
    })
    const vendedorRole = await prisma.role.create({
      data: { name: `Vendedor Deny Cancel Test ${Date.now()}`, companyId: acmeCompanyId },
    })
    await prisma.rolePermission.create({ data: { roleId: vendedorRole.id, permissionId: createPerm.id } })
    await prisma.userRoleAssignment.create({
      data: { userId: vendedorUser.id, roleId: vendedorRole.id, companyId: acmeCompanyId },
    })
    const vendedorToken = generateToken({
      id: vendedorUser.id,
      email: vendedorUser.email,
      role: vendedorUser.role,
      isSuperuser: vendedorUser.isSuperuser,
    })

    // Use a fake sale UUID — we expect 403 from the permission check before business logic
    const fakeSaleId = '00000000-0000-0000-0000-000000000001'
    const acmeStore = await prisma.store.findFirst({
      where: { companyId: acmeCompanyId },
      select: { id: true },
    })

    const { res } = await inject(app, {
      method: 'POST',
      url: `/v1/pos/sales/${fakeSaleId}/cancel`,
      headers: {
        Authorization: `Bearer ${vendedorToken}`,
        'content-type': 'application/json',
        ...(acmeStore ? { 'x-store-id': acmeStore.id } : {}),
      },
      payload: {},
    })
    expect(res.statusCode).toBe(403)
  })

  // ---------------------------------------------------------------------------
  // 3b. requirePermission deny-by-default — refund (Round 3, FIX 2)
  //     `pos.sales.refund` is a NEW permission (previously the refund route had no
  //     permission check at all). Mirrors the cancel deny-by-default coverage above: a USER
  //     with only create-shaped permissions must get 403 refunding, before business logic runs.
  // ---------------------------------------------------------------------------

  it('USER without refund permission gets 403 on sale refund (deny-by-default)', async () => {
    const vendedorEmail = `vendedor-deny-refund-${Date.now()}@authz.test`
    const vendedorUser = await prisma.user.create({
      data: {
        email: vendedorEmail,
        password: await bcrypt.hash('password123', 10),
        firstName: 'Vendedor',
        lastName: 'DenyRefundTest',
        role: 'USER',
        isActive: true,
        isSuperuser: false,
      },
    })
    await prisma.companyMember.create({
      data: { userId: vendedorUser.id, companyId: acmeCompanyId, membershipRole: 'USER' },
    })
    const createPerm = await prisma.permission.upsert({
      where: { name: 'pos.sales.create' },
      create: { name: 'pos.sales.create', resource: 'pos.sales', action: 'create' },
      update: { resource: 'pos.sales', action: 'create' },
    })
    const vendedorRole = await prisma.role.create({
      data: { name: `Vendedor Deny Refund Test ${Date.now()}`, companyId: acmeCompanyId },
    })
    await prisma.rolePermission.create({ data: { roleId: vendedorRole.id, permissionId: createPerm.id } })
    await prisma.userRoleAssignment.create({
      data: { userId: vendedorUser.id, roleId: vendedorRole.id, companyId: acmeCompanyId },
    })
    const vendedorToken = generateToken({
      id: vendedorUser.id,
      email: vendedorUser.email,
      role: vendedorUser.role,
      isSuperuser: vendedorUser.isSuperuser,
    })

    // Use a fake sale UUID — we expect 403 from the permission check before business logic.
    // Deliberately no `x-store-id` header: this user has no UserStore assignment, so sending
    // one would 403 at the earlier store-access gate (`requirePosContext`) instead of the
    // `requirePermission('pos.sales', 'refund')` gate this test is meant to isolate.
    const fakeSaleId = '00000000-0000-0000-0000-000000000002'

    const { res } = await inject(app, {
      method: 'POST',
      url: `/v1/pos/sales/${fakeSaleId}/refund`,
      headers: {
        Authorization: `Bearer ${vendedorToken}`,
        'content-type': 'application/json',
      },
      payload: {},
    })
    expect(res.statusCode).toBe(403)
  })

  // ---------------------------------------------------------------------------
  // 4. Nivel 2: member with module disabled gets 403
  //    Temporarily disable pos for acmeMember, then verify GET /sales → 403
  // ---------------------------------------------------------------------------

  it('Member with pos disabled in CompanyMemberModule cannot access pos routes', async () => {
    // Find pos module
    const posModule = await prisma.module.findUnique({ where: { key: 'pos' } })
    if (!posModule) throw new Error('pos module not found in seed')

    // Disable pos for this member
    await prisma.companyMemberModule.upsert({
      where: { companyMemberId_moduleId: { companyMemberId: acmeMemberId, moduleId: posModule.id } },
      create: { companyMemberId: acmeMemberId, moduleId: posModule.id, enabled: false },
      update: { enabled: false },
    })

    const acmeStore = await prisma.store.findFirst({
      where: { companyId: acmeCompanyId },
      select: { id: true },
    })

    const { res } = await inject(app, {
      method: 'GET',
      url: '/v1/pos/sales',
      headers: {
        Authorization: `Bearer ${acmeUserToken}`,
        ...(acmeStore ? { 'x-store-id': acmeStore.id } : {}),
      },
    })
    expect(res.statusCode).toBe(403)

    // Restore: re-enable pos for this member
    await prisma.companyMemberModule.update({
      where: { companyMemberId_moduleId: { companyMemberId: acmeMemberId, moduleId: posModule.id } },
      data: { enabled: true },
    })
  })

  // ---------------------------------------------------------------------------
  // 5. Owner can manage member modules and roles (positive path)
  // ---------------------------------------------------------------------------

  it('Owner can read member modules', async () => {
    const { res, json } = await inject(app, {
      method: 'GET',
      url: `/v1/companies/${acmeCompanyId}/members/${acmeMemberId}/modules`,
      headers: { Authorization: `Bearer ${acmeOwnerToken}` },
    })
    expect(res.statusCode).toBe(200)
    expect(json.success).toBe(true)
    expect(Array.isArray(json.data)).toBe(true)
  })

  it('Owner can read member roles', async () => {
    const { res, json } = await inject(app, {
      method: 'GET',
      url: `/v1/companies/${acmeCompanyId}/members/${acmeMemberId}/roles`,
      headers: { Authorization: `Bearer ${acmeOwnerToken}` },
    })
    expect(res.statusCode).toBe(200)
    expect(json.success).toBe(true)
    expect(Array.isArray(json.data)).toBe(true)
  })

  it('Owner cannot assign cross-company roles (non-existent roleId for this company)', async () => {
    const fakeRoleId = '00000000-0000-0000-0000-000000000099'
    const { res } = await inject(app, {
      method: 'PUT',
      url: `/v1/companies/${acmeCompanyId}/members/${acmeMemberId}/roles`,
      headers: {
        Authorization: `Bearer ${acmeOwnerToken}`,
        'content-type': 'application/json',
      },
      payload: { roleIds: [fakeRoleId] },
    })
    expect(res.statusCode).toBe(400)
  })
})
