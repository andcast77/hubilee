/**
 * Security regression: store-scope authorization must be DENY-BY-DEFAULT and
 * SERVER-DERIVED, not fail-open when the optional `X-Store-Id` header is omitted.
 *
 * Root cause (fixed here): `requireShopflowContext` used to set `request.storeId =
 * undefined` whenever the client omitted `X-Store-Id`, and both
 * `assertStoreMatchForScopedUser` and `resolveEffectiveStoreIdForScopedUser` treated a
 * `null`/`undefined` ctx.storeId as "no restriction" for non-full-access users. A
 * store-scoped user (e.g. a Cajero assigned to a single store via `UserStore`) could
 * therefore bypass store isolation on every mutating + read shopflow endpoint simply by
 * NOT sending the header.
 *
 * The fix derives the effective store from server-side `UserStore` membership: if the
 * user has exactly one membership it is auto-selected; if the header is supplied it is
 * validated against membership; if ambiguous (0 or 2+ memberships and no header), the
 * store context stays unset and every store-scoped check denies by default.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { prisma } from '@multisystem/database'
import { Buffer } from 'node:buffer'

import './setup'

import { generateToken } from '../../core/auth.js'

type InjectResult = { statusCode: number; payload: unknown }

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

async function upsertPermission(name: string, resource: string, action: string) {
  return prisma.permission.upsert({
    where: { name },
    create: { name, resource, action },
    update: { resource, action },
  })
}

describe('Shopflow store scope: deny-by-default when X-Store-Id header is omitted', () => {
  let app: FastifyInstance

  let acmeCompanyId: string
  let storeAId: string
  let storeBId: string

  let ownerToken: string
  let ownerUserId: string

  let scopedToken: string
  let scopedUserId: string

  beforeAll(async () => {
    const mod = await import('../../server.js')
    app = mod.default as FastifyInstance

    const acme = await prisma.company.findFirst({ where: { name: 'Acme Inc.' } })
    if (!acme) throw new Error('Missing seeded Acme company')
    acmeCompanyId = acme.id

    let acmeStores = await prisma.store.findMany({
      where: { companyId: acmeCompanyId, active: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
      take: 2,
    })
    if (acmeStores.length < 2) {
      const missing = 2 - acmeStores.length
      for (let i = 0; i < missing; i++) {
        await prisma.store.create({
          data: {
            companyId: acmeCompanyId,
            name: `Acme DenyDefault Store ${Date.now()}-${i}`,
            code: `ACME-DD-${Date.now()}-${i}`,
            active: true,
          },
        })
      }
      acmeStores = await prisma.store.findMany({
        where: { companyId: acmeCompanyId, active: true },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
        take: 2,
      })
    }
    storeAId = acmeStores[0].id
    storeBId = acmeStores[1].id

    const ownerUser = await prisma.user.findUnique({ where: { email: 'gerente@acme.com' } })
    if (!ownerUser) throw new Error('Missing seeded Acme owner user')
    ownerUserId = ownerUser.id
    ownerToken = generateToken({
      id: ownerUser.id,
      email: ownerUser.email,
      role: ownerUser.role,
      isSuperuser: ownerUser.isSuperuser,
    })

    // Scoped user: plain USER membership, assigned to storeA ONLY (single UserStore row),
    // granted every shopflow permission this test exercises so failures are attributable
    // purely to the store-scope guard, not RBAC.
    const scopedEmail = `cajero-deny-default-${Date.now()}@authz.test`
    const scopedUser = await prisma.user.create({
      data: {
        email: scopedEmail,
        password: await bcrypt.hash('password123', 10),
        firstName: 'Cajero',
        lastName: 'DenyDefaultTest',
        role: 'USER',
        isActive: true,
        isSuperuser: false,
      },
    })
    scopedUserId = scopedUser.id
    await prisma.companyMember.create({
      data: { userId: scopedUserId, companyId: acmeCompanyId, membershipRole: 'USER' },
    })
    await prisma.userStore.create({ data: { userId: scopedUserId, storeId: storeAId } })

    const permissions = await Promise.all([
      upsertPermission('shopflow.sales.create', 'shopflow.sales', 'create'),
      upsertPermission('shopflow.sales.cancel', 'shopflow.sales', 'cancel'),
      upsertPermission('shopflow.sales.settle', 'shopflow.sales', 'settle'),
      upsertPermission('shopflow.sales.refund', 'shopflow.sales', 'refund'),
      upsertPermission('shopflow.cash-registers.create', 'shopflow.cash-registers', 'create'),
      upsertPermission('shopflow.cash-registers.read', 'shopflow.cash-registers', 'read'),
      upsertPermission('shopflow.cash-sessions.open', 'shopflow.cash-sessions', 'open'),
      upsertPermission('shopflow.cash-sessions.close', 'shopflow.cash-sessions', 'close'),
      upsertPermission('shopflow.cash-sessions.read', 'shopflow.cash-sessions', 'read'),
    ])
    const scopedRole = await prisma.role.create({
      data: { name: `Cajero DenyDefault Test ${Date.now()}`, companyId: acmeCompanyId },
    })
    await prisma.rolePermission.createMany({
      data: permissions.map((p) => ({ roleId: scopedRole.id, permissionId: p.id })),
    })
    await prisma.userRoleAssignment.create({
      data: { userId: scopedUserId, roleId: scopedRole.id, companyId: acmeCompanyId },
    })
    scopedToken = generateToken({
      id: scopedUser.id,
      email: scopedUser.email,
      role: scopedUser.role,
      isSuperuser: scopedUser.isSuperuser,
    })
  })

  // ---------------------------------------------------------------------------
  // Fixtures living in storeB (the store the scoped user is NOT assigned to).
  // ---------------------------------------------------------------------------

  async function createSaleFixture(status: 'PENDING' | 'COMPLETED', storeId: string) {
    return prisma.sale.create({
      data: {
        companyId: acmeCompanyId,
        storeId,
        userId: ownerUserId,
        sellerId: ownerUserId,
        total: 100,
        subtotal: 100,
        tax: 0,
        discount: null,
        status,
        paymentMethod: status === 'COMPLETED' ? 'CASH' : null,
      },
    })
  }

  async function createRegisterFixture(storeId: string) {
    return prisma.cashRegister.create({
      data: { companyId: acmeCompanyId, storeId, name: `Caja DenyDefault ${Date.now()}-${Math.random()}` },
    })
  }

  async function createOpenSessionFixture(storeId: string, cashRegisterId: string) {
    return prisma.cashSession.create({
      data: {
        companyId: acmeCompanyId,
        storeId,
        cashRegisterId,
        openedByUserId: ownerUserId,
        status: 'OPEN',
        openingFloat: 100,
      },
    })
  }

  // ---------------------------------------------------------------------------
  // (a) Mutating routes: store-scoped user, NO X-Store-Id header, targeting a
  //     sale/register/session that belongs to a store they are NOT assigned to.
  //     Must be DENIED (403), not fail open.
  // ---------------------------------------------------------------------------

  it('cancelSale: denied cross-store without X-Store-Id header', async () => {
    const sale = await createSaleFixture('PENDING', storeBId)
    const { res } = await inject(app, {
      method: 'POST',
      url: `/v1/shopflow/sales/${sale.id}/cancel`,
      headers: { Authorization: `Bearer ${scopedToken}`, 'content-type': 'application/json' },
      payload: {},
    })
    expect(res.statusCode).toBe(403)
  })

  it('refundSale: denied cross-store without X-Store-Id header', async () => {
    const sale = await createSaleFixture('COMPLETED', storeBId)
    const { res } = await inject(app, {
      method: 'POST',
      url: `/v1/shopflow/sales/${sale.id}/refund`,
      headers: { Authorization: `Bearer ${scopedToken}`, 'content-type': 'application/json' },
      payload: {},
    })
    expect(res.statusCode).toBe(403)
  })

  it('settleSale: denied cross-store without X-Store-Id header', async () => {
    const sale = await createSaleFixture('PENDING', storeBId)
    const register = await createRegisterFixture(storeBId)
    const session = await createOpenSessionFixture(storeBId, register.id)
    const { res } = await inject(app, {
      method: 'POST',
      url: `/v1/shopflow/sales/${sale.id}/settle`,
      headers: { Authorization: `Bearer ${scopedToken}`, 'content-type': 'application/json' },
      payload: { cashSessionId: session.id, paymentMethod: 'CASH', paidAmount: 100 },
    })
    expect(res.statusCode).toBe(403)
  })

  it('createSale: denied cross-store body storeId without X-Store-Id header', async () => {
    const { res } = await inject(app, {
      method: 'POST',
      url: '/v1/shopflow/sales',
      headers: { Authorization: `Bearer ${scopedToken}`, 'content-type': 'application/json' },
      payload: {
        storeId: storeBId,
        userId: scopedUserId,
        items: [{ productId: '00000000-0000-4000-8000-000000000099', quantity: 1, price: 10 }],
      },
    })
    expect(res.statusCode).toBe(403)
  })

  it('createCashRegister: denied cross-store body storeId without X-Store-Id header', async () => {
    const { res } = await inject(app, {
      method: 'POST',
      url: '/v1/shopflow/cash-registers',
      headers: { Authorization: `Bearer ${scopedToken}`, 'content-type': 'application/json' },
      payload: { storeId: storeBId, name: `Caja Bypass ${Date.now()}` },
    })
    expect(res.statusCode).toBe(403)
  })

  it('openCashSession: denied cross-store register without X-Store-Id header', async () => {
    const register = await createRegisterFixture(storeBId)
    const { res } = await inject(app, {
      method: 'POST',
      url: '/v1/shopflow/cash-sessions/open',
      headers: { Authorization: `Bearer ${scopedToken}`, 'content-type': 'application/json' },
      payload: { cashRegisterId: register.id, openingFloat: 100 },
    })
    expect(res.statusCode).toBe(403)
  })

  it('closeCashSession: denied cross-store session without X-Store-Id header', async () => {
    const register = await createRegisterFixture(storeBId)
    const session = await createOpenSessionFixture(storeBId, register.id)
    const { res } = await inject(app, {
      method: 'POST',
      url: `/v1/shopflow/cash-sessions/${session.id}/close`,
      headers: { Authorization: `Bearer ${scopedToken}`, 'content-type': 'application/json' },
      payload: { countedCash: 100 },
    })
    expect(res.statusCode).toBe(403)
  })

  // ---------------------------------------------------------------------------
  // (b) Read paths: client-supplied `?storeId=` must not override/leak past
  //     server-derived scope when the header is omitted.
  // ---------------------------------------------------------------------------

  it('listSales: denied when query storeId targets a store outside the derived scope', async () => {
    await createSaleFixture('COMPLETED', storeBId)
    const { res } = await inject(app, {
      method: 'GET',
      url: `/v1/shopflow/sales?storeId=${storeBId}`,
      headers: { Authorization: `Bearer ${scopedToken}` },
    })
    expect(res.statusCode).toBe(403)
  })

  it('listCashRegisters: denied when query storeId targets a store outside the derived scope', async () => {
    const { res } = await inject(app, {
      method: 'GET',
      url: `/v1/shopflow/cash-registers?storeId=${storeBId}`,
      headers: { Authorization: `Bearer ${scopedToken}` },
    })
    expect(res.statusCode).toBe(403)
  })

  it('listCashSessions: denied when query storeId targets a store outside the derived scope', async () => {
    const { res } = await inject(app, {
      method: 'GET',
      url: `/v1/shopflow/cash-sessions?storeId=${storeBId}`,
      headers: { Authorization: `Bearer ${scopedToken}` },
    })
    expect(res.statusCode).toBe(403)
  })

  // ---------------------------------------------------------------------------
  // (c) Same-store operation without the header still succeeds — the derived
  //     single-membership store is trusted, this is not "always deny".
  // ---------------------------------------------------------------------------

  it('createCashRegister: succeeds for the assigned store without X-Store-Id header', async () => {
    const { res } = await inject(app, {
      method: 'POST',
      url: '/v1/shopflow/cash-registers',
      headers: { Authorization: `Bearer ${scopedToken}`, 'content-type': 'application/json' },
      payload: { storeId: storeAId, name: `Caja Allowed ${Date.now()}` },
    })
    expect(res.statusCode).toBe(200)
  })

  it('listSales: succeeds and stays scoped to the assigned store without X-Store-Id header', async () => {
    const { res, json } = await inject(app, {
      method: 'GET',
      url: '/v1/shopflow/sales',
      headers: { Authorization: `Bearer ${scopedToken}` },
    })
    expect(res.statusCode).toBe(200)
    const sales = json?.data?.sales ?? []
    for (const sale of sales) {
      expect(sale.storeId).toBe(storeAId)
    }
  })

  // ---------------------------------------------------------------------------
  // (d) Full-access users (Owner/Admin/superuser) are unaffected: omitting the
  //     header still lets them operate across stores.
  // ---------------------------------------------------------------------------

  it('full-access owner: unaffected by missing X-Store-Id header on cross-store write', async () => {
    const { res } = await inject(app, {
      method: 'POST',
      url: '/v1/shopflow/cash-registers',
      headers: { Authorization: `Bearer ${ownerToken}`, 'content-type': 'application/json' },
      payload: { storeId: storeBId, name: `Caja Owner ${Date.now()}` },
    })
    expect(res.statusCode).toBe(200)
  })
})
