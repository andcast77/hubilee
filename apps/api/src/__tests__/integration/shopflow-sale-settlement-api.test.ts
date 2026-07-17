/**
 * POS Cash Session (PR4): HTTP layer for sale lifecycle + settlement.
 * Covers `requirePermission('shopflow.sales', 'settle')` RBAC gating on
 * `POST /v1/shopflow/sales/:id/settle`, plus the PENDING creation + list flow.
 *
 * `shopflow.sales.settle` is granted to a locally-seeded Cajero-shaped role here
 * (mirrors shopflow-cash-session-api.test.ts's PR2 pattern) — the global seed.ts
 * wiring for the real Cajero/Vendedor roles is exercised at seed-time, not by this
 * HTTP suite.
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

describe('Shopflow sale settlement: HTTP API + RBAC', () => {
  let app: FastifyInstance

  let acmeCompanyId: string
  let acmeStoreId: string
  let acmeProductId: string
  let acmeOwnerUserId: string

  let ownerToken: string
  let vendedorToken: string // USER role, only sales.create granted — no settle
  let cajeroToken: string // USER role, sales.create + sales.settle granted locally

  beforeAll(async () => {
    const mod = await import('../../server.js')
    app = mod.default as FastifyInstance

    const acme = await prisma.company.findFirst({ where: { name: 'Acme Inc.' } })
    if (!acme) throw new Error('Missing seeded Acme company')
    acmeCompanyId = acme.id

    const acmeStore = await prisma.store.findFirst({ where: { companyId: acmeCompanyId } })
    if (!acmeStore) throw new Error('Missing seeded Acme store')
    acmeStoreId = acmeStore.id

    const acmeOwnerUser = await prisma.user.findUnique({ where: { email: 'gerente@acme.com' } })
    if (!acmeOwnerUser) throw new Error('Missing seeded owner user')
    acmeOwnerUserId = acmeOwnerUser.id
    ownerToken = generateToken({
      id: acmeOwnerUser.id,
      email: acmeOwnerUser.email,
      role: acmeOwnerUser.role,
      isSuperuser: acmeOwnerUser.isSuperuser,
    })

    const product = await prisma.product.create({
      data: { companyId: acmeCompanyId, name: `PR4 HTTP Product ${Date.now()}`, price: 100 },
    })
    acmeProductId = product.id
    await prisma.storeInventory.create({
      data: { companyId: acmeCompanyId, storeId: acmeStoreId, productId: product.id, quantity: 100 },
    })

    // --- Vendedor: USER, only sales.create — no settle permission ---
    const vendedorEmail = `vendedor-settle-${Date.now()}@authz.test`
    const vendedorUser = await prisma.user.create({
      data: {
        email: vendedorEmail,
        password: await bcrypt.hash('password123', 10),
        firstName: 'Vendedor',
        lastName: 'SettleTest',
        role: 'USER',
        isActive: true,
        isSuperuser: false,
      },
    })
    await prisma.companyMember.create({
      data: { userId: vendedorUser.id, companyId: acmeCompanyId, membershipRole: 'USER' },
    })
    await prisma.userStore.create({ data: { userId: vendedorUser.id, storeId: acmeStoreId } })

    const createPerm = await upsertPermission('shopflow.sales.create', 'shopflow.sales', 'create')
    const vendedorRole = await prisma.role.create({
      data: { name: `Vendedor Settle Test ${Date.now()}`, companyId: acmeCompanyId },
    })
    await prisma.rolePermission.create({ data: { roleId: vendedorRole.id, permissionId: createPerm.id } })
    await prisma.userRoleAssignment.create({
      data: { userId: vendedorUser.id, roleId: vendedorRole.id, companyId: acmeCompanyId },
    })
    vendedorToken = generateToken({
      id: vendedorUser.id,
      email: vendedorUser.email,
      role: vendedorUser.role,
      isSuperuser: vendedorUser.isSuperuser,
    })

    // --- Cajero: USER, sales.create + sales.settle granted locally ---
    const cajeroEmail = `cajero-settle-${Date.now()}@authz.test`
    const cajeroUser = await prisma.user.create({
      data: {
        email: cajeroEmail,
        password: await bcrypt.hash('password123', 10),
        firstName: 'Cajero',
        lastName: 'SettleTest',
        role: 'USER',
        isActive: true,
        isSuperuser: false,
      },
    })
    await prisma.companyMember.create({
      data: { userId: cajeroUser.id, companyId: acmeCompanyId, membershipRole: 'USER' },
    })
    await prisma.userStore.create({ data: { userId: cajeroUser.id, storeId: acmeStoreId } })

    const settlePerm = await upsertPermission('shopflow.sales.settle', 'shopflow.sales', 'settle')
    const cajeroRole = await prisma.role.create({
      data: { name: `Cajero Settle Test ${Date.now()}`, companyId: acmeCompanyId },
    })
    await prisma.rolePermission.createMany({
      data: [createPerm, settlePerm].map((p) => ({ roleId: cajeroRole.id, permissionId: p.id })),
    })
    await prisma.userRoleAssignment.create({
      data: { userId: cajeroUser.id, roleId: cajeroRole.id, companyId: acmeCompanyId },
    })
    cajeroToken = generateToken({
      id: cajeroUser.id,
      email: cajeroUser.email,
      role: cajeroUser.role,
      isSuperuser: cajeroUser.isSuperuser,
    })
  }, 30_000)

  async function createPendingSale(token: string) {
    const { res, json } = await inject(app, {
      method: 'POST',
      url: '/v1/shopflow/sales',
      headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json', 'x-store-id': acmeStoreId },
      payload: {
        storeId: acmeStoreId,
        userId: acmeOwnerUserId,
        items: [{ productId: acmeProductId, quantity: 1, price: 100 }],
      },
    })
    expect(res.statusCode).toBe(200)
    expect(json.data.status).toBe('PENDING')
    return json.data.id as string
  }

  // Opened by the OWNER (who has full cash-session access via membership bypass) — the
  // settle route is what's under RBAC test here, not who is allowed to open a register.
  async function openSession() {
    const created = await inject(app, {
      method: 'POST',
      url: '/v1/shopflow/cash-registers',
      headers: { Authorization: `Bearer ${ownerToken}`, 'content-type': 'application/json' },
      payload: { storeId: acmeStoreId, name: `Caja Settle ${Date.now()}-${Math.random()}` },
    })
    const registerId = created.json.data.id

    const opened = await inject(app, {
      method: 'POST',
      url: '/v1/shopflow/cash-sessions/open',
      headers: { Authorization: `Bearer ${ownerToken}`, 'content-type': 'application/json' },
      payload: { cashRegisterId: registerId, openingFloat: 0 },
    })
    expect(opened.res.statusCode).toBe(200)
    return opened.json.data.id as string
  }

  it('creates a PENDING sale without invoice number, then lists it via status=PENDING', async () => {
    const saleId = await createPendingSale(ownerToken)

    const { res, json } = await inject(app, {
      method: 'GET',
      url: '/v1/shopflow/sales?status=PENDING',
      headers: { Authorization: `Bearer ${ownerToken}` },
    })
    expect(res.statusCode).toBe(200)
    expect(json.data.sales.some((s: { id: string }) => s.id === saleId)).toBe(true)
  })

  it('vendedor (no settle permission) gets 403 settling a pending sale', async () => {
    const saleId = await createPendingSale(vendedorToken)
    const sessionId = await openSession()

    const { res } = await inject(app, {
      method: 'POST',
      url: `/v1/shopflow/sales/${saleId}/settle`,
      headers: { Authorization: `Bearer ${vendedorToken}`, 'content-type': 'application/json', 'x-store-id': acmeStoreId },
      payload: { cashSessionId: sessionId, paymentMethod: 'CASH', paidAmount: 1_000_000 },
    })
    expect(res.statusCode).toBe(403)
  })

  it('cajero (settle permission granted) settles a pending sale', async () => {
    const saleId = await createPendingSale(cajeroToken)
    const sessionId = await openSession()

    const { res, json } = await inject(app, {
      method: 'POST',
      url: `/v1/shopflow/sales/${saleId}/settle`,
      headers: { Authorization: `Bearer ${cajeroToken}`, 'content-type': 'application/json', 'x-store-id': acmeStoreId },
      payload: { cashSessionId: sessionId, paymentMethod: 'CASH', paidAmount: 1_000_000 },
    })
    expect(res.statusCode).toBe(200)
    expect(json.data.status).toBe('COMPLETED')
    expect(json.data.cashSessionId).toBe(sessionId)
    expect(json.data.invoiceNumber).not.toBeNull()
  })

  it('rejects re-settling an already-COMPLETED sale (400)', async () => {
    const saleId = await createPendingSale(cajeroToken)
    const sessionId = await openSession()

    await inject(app, {
      method: 'POST',
      url: `/v1/shopflow/sales/${saleId}/settle`,
      headers: { Authorization: `Bearer ${cajeroToken}`, 'content-type': 'application/json', 'x-store-id': acmeStoreId },
      payload: { cashSessionId: sessionId, paymentMethod: 'CASH', paidAmount: 1_000_000 },
    })

    const otherSessionId = await openSession()
    const { res } = await inject(app, {
      method: 'POST',
      url: `/v1/shopflow/sales/${saleId}/settle`,
      headers: { Authorization: `Bearer ${cajeroToken}`, 'content-type': 'application/json', 'x-store-id': acmeStoreId },
      payload: { cashSessionId: otherSessionId, paymentMethod: 'CASH', paidAmount: 1_000_000 },
    })
    expect(res.statusCode).toBe(400)
  })
})
