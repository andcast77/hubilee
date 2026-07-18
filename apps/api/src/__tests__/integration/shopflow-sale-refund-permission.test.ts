/**
 * POS Cash Session (Round 3, FIX 2): `POST /v1/shopflow/sales/:id/refund` used to have only
 * `preHandler: pre` — no permission check at all, and `shopflow.sales.refund` didn't even exist
 * as a permission. Any shopflow-module user (e.g. Vendedor) could refund any COMPLETED sale and
 * silently drop it from an open session's arqueo. Refund is now gated on
 * `requirePermission('shopflow.sales', 'refund')`, granted only to elevated roles (Gerente;
 * Owner/Admin bypass via membership).
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

describe('Shopflow sale refund: HTTP API + RBAC (Round 3, FIX 2)', () => {
  let app: FastifyInstance

  let acmeCompanyId: string
  let acmeStoreId: string
  let acmeProductId: string
  let acmeOwnerUserId: string

  let ownerToken: string // gerente@acme.com — OWNER membership, bypasses permission checks
  let vendedorToken: string // USER, only sales.create — no refund
  let cajeroToken: string // USER, create+settle+cancel granted locally — still no refund
  let gerenteToken: string // USER, assigned the REAL seeded Gerente role (has refund via seed grant)

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
      data: { companyId: acmeCompanyId, name: `Refund Perm Product ${Date.now()}`, price: 100 },
    })
    acmeProductId = product.id
    await prisma.storeInventory.create({
      data: { companyId: acmeCompanyId, storeId: acmeStoreId, productId: product.id, quantity: 1000 },
    })

    // --- Vendedor: USER, only sales.create — no refund permission ---
    const vendedorEmail = `vendedor-refund-${Date.now()}@authz.test`
    const vendedorUser = await prisma.user.create({
      data: {
        email: vendedorEmail,
        password: await bcrypt.hash('password123', 10),
        firstName: 'Vendedor',
        lastName: 'RefundTest',
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
      data: { name: `Vendedor Refund Test ${Date.now()}`, companyId: acmeCompanyId },
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

    // --- Cajero: USER, create+settle+cancel granted locally — deliberately NO refund ---
    const cajeroEmail = `cajero-refund-${Date.now()}@authz.test`
    const cajeroUser = await prisma.user.create({
      data: {
        email: cajeroEmail,
        password: await bcrypt.hash('password123', 10),
        firstName: 'Cajero',
        lastName: 'RefundTest',
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
    const cancelPerm = await upsertPermission('shopflow.sales.cancel', 'shopflow.sales', 'cancel')
    const cajeroRole = await prisma.role.create({
      data: { name: `Cajero Refund Test ${Date.now()}`, companyId: acmeCompanyId },
    })
    await prisma.rolePermission.createMany({
      data: [createPerm, settlePerm, cancelPerm].map((p) => ({ roleId: cajeroRole.id, permissionId: p.id })),
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

    // --- Gerente: USER, assigned the REAL seeded "Gerente" role (exercises the seed.ts grant,
    //     not a locally-fabricated permission) ---
    const gerenteRoleSeeded = await prisma.role.findFirst({
      where: { name: 'Gerente', companyId: acmeCompanyId },
    })
    if (!gerenteRoleSeeded) throw new Error('Missing seeded Gerente role')

    const gerenteEmail = `gerente-refund-${Date.now()}@authz.test`
    const gerenteUser = await prisma.user.create({
      data: {
        email: gerenteEmail,
        password: await bcrypt.hash('password123', 10),
        firstName: 'Gerente',
        lastName: 'RefundTest',
        role: 'USER',
        isActive: true,
        isSuperuser: false,
      },
    })
    await prisma.companyMember.create({
      data: { userId: gerenteUser.id, companyId: acmeCompanyId, membershipRole: 'USER' },
    })
    await prisma.userStore.create({ data: { userId: gerenteUser.id, storeId: acmeStoreId } })
    await prisma.userRoleAssignment.create({
      data: { userId: gerenteUser.id, roleId: gerenteRoleSeeded.id, companyId: acmeCompanyId },
    })
    gerenteToken = generateToken({
      id: gerenteUser.id,
      email: gerenteUser.email,
      role: gerenteUser.role,
      isSuperuser: gerenteUser.isSuperuser,
    })
  }, 30_000)

  // Creates+settles a direct/kiosco sale (status COMPLETED) using the OWNER token so the register
  // and session are opened with full access — what's under test is who can refund it afterwards.
  async function createCompletedSale() {
    const registerRes = await inject(app, {
      method: 'POST',
      url: '/v1/shopflow/cash-registers',
      headers: { Authorization: `Bearer ${ownerToken}`, 'content-type': 'application/json', 'x-store-id': acmeStoreId },
      payload: { storeId: acmeStoreId, name: `Caja Refund Perm ${Date.now()}-${Math.random()}` },
    })
    expect(registerRes.res.statusCode).toBe(200)
    const registerId = registerRes.json.data.id as string

    const sessionRes = await inject(app, {
      method: 'POST',
      url: '/v1/shopflow/cash-sessions/open',
      headers: { Authorization: `Bearer ${ownerToken}`, 'content-type': 'application/json', 'x-store-id': acmeStoreId },
      payload: { cashRegisterId: registerId, openingFloat: 0 },
    })
    expect(sessionRes.res.statusCode).toBe(200)
    const sessionId = sessionRes.json.data.id as string

    const created = await inject(app, {
      method: 'POST',
      url: '/v1/shopflow/sales',
      headers: { Authorization: `Bearer ${ownerToken}`, 'content-type': 'application/json', 'x-store-id': acmeStoreId },
      payload: {
        storeId: acmeStoreId,
        userId: acmeOwnerUserId,
        items: [{ productId: acmeProductId, quantity: 1, price: 100 }],
        cashSessionId: sessionId,
        paymentMethod: 'CASH',
        paidAmount: 1000,
      },
    })
    expect(created.res.statusCode).toBe(200)
    expect(created.json.data.status).toBe('COMPLETED')
    return created.json.data.id as string
  }

  it('Vendedor (create-only) gets 403 refunding a COMPLETED sale', async () => {
    const saleId = await createCompletedSale()

    const { res } = await inject(app, {
      method: 'POST',
      url: `/v1/shopflow/sales/${saleId}/refund`,
      headers: { Authorization: `Bearer ${vendedorToken}`, 'content-type': 'application/json', 'x-store-id': acmeStoreId },
      payload: {},
    })
    expect(res.statusCode).toBe(403)

    const unchanged = await prisma.sale.findUnique({ where: { id: saleId } })
    expect(unchanged?.status).toBe('COMPLETED')
  })

  it('Cajero (create+settle+cancel, no refund) gets 403 refunding a COMPLETED sale', async () => {
    const saleId = await createCompletedSale()

    const { res } = await inject(app, {
      method: 'POST',
      url: `/v1/shopflow/sales/${saleId}/refund`,
      headers: { Authorization: `Bearer ${cajeroToken}`, 'content-type': 'application/json', 'x-store-id': acmeStoreId },
      payload: {},
    })
    expect(res.statusCode).toBe(403)

    const unchanged = await prisma.sale.findUnique({ where: { id: saleId } })
    expect(unchanged?.status).toBe('COMPLETED')
  })

  it('Gerente (real seeded role, has shopflow.sales.refund) can refund a COMPLETED sale', async () => {
    const saleId = await createCompletedSale()

    const { res, json } = await inject(app, {
      method: 'POST',
      url: `/v1/shopflow/sales/${saleId}/refund`,
      headers: { Authorization: `Bearer ${gerenteToken}`, 'content-type': 'application/json', 'x-store-id': acmeStoreId },
      payload: {},
    })
    expect(res.statusCode).toBe(200)
    expect(json.data.status).toBe('REFUNDED')
  })

  it('Owner (membership bypass) can refund a COMPLETED sale', async () => {
    const saleId = await createCompletedSale()

    const { res, json } = await inject(app, {
      method: 'POST',
      url: `/v1/shopflow/sales/${saleId}/refund`,
      headers: { Authorization: `Bearer ${ownerToken}`, 'content-type': 'application/json', 'x-store-id': acmeStoreId },
      payload: {},
    })
    expect(res.statusCode).toBe(200)
    expect(json.data.status).toBe('REFUNDED')
  })
})
