/**
 * POS Cash Session (PR2): HTTP layer for caja registers/sessions.
 * Covers `requirePermission('pos.cash-registers'|'pos.cash-sessions', action)`
 * RBAC gating, tenant isolation, and store scoping on top of pos-cash.service.ts.
 *
 * Permissions/roles used here (pos.cash-registers.*, pos.cash-sessions.*) are
 * seeded LOCALLY in this test file's beforeAll — the global seed.ts extension for a
 * Cajero/Vendedor role wiring these permissions is PR3, not this PR.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { prisma } from '@hubilee/database'
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

describe('Pos cash registers/sessions: HTTP API + RBAC', () => {
  let app: FastifyInstance

  let acmeCompanyId: string
  let betaCompanyId: string
  let acmeStoreId: string
  let acmeStoreBId: string
  let betaStoreId: string

  let ownerToken: string
  let vendedorToken: string // USER role, no cash-session permissions at all
  let cajeroToken: string // USER role, granted cash-sessions.open/close/read locally
  let betaOwnerToken: string

  let cajeroUserId: string

  beforeAll(async () => {
    const mod = await import('../../server.js')
    app = mod.default as FastifyInstance

    const acme = await prisma.company.findFirst({ where: { name: 'Acme Inc.' } })
    const beta = await prisma.company.findFirst({ where: { name: 'Beta Corp.' } })
    if (!acme || !beta) throw new Error('Missing seeded companies')
    acmeCompanyId = acme.id
    betaCompanyId = beta.id

    const acmeStores = await prisma.store.findMany({ where: { companyId: acmeCompanyId }, take: 2 })
    if (acmeStores.length < 2) throw new Error('Missing seeded Acme stores (need at least 2)')
    acmeStoreId = acmeStores[0].id
    acmeStoreBId = acmeStores[1].id

    const betaStore = await prisma.store.findFirst({ where: { companyId: betaCompanyId } })
    if (!betaStore) throw new Error('Missing seeded Beta store')
    betaStoreId = betaStore.id

    const acmeOwnerUser = await prisma.user.findUnique({ where: { email: 'gerente@acme.com' } })
    const betaOwnerUser = await prisma.user.findUnique({ where: { email: 'gerente@betacorp.com' } })
    if (!acmeOwnerUser || !betaOwnerUser) throw new Error('Missing seeded owner users')

    ownerToken = generateToken({
      id: acmeOwnerUser.id,
      email: acmeOwnerUser.email,
      role: acmeOwnerUser.role,
      isSuperuser: acmeOwnerUser.isSuperuser,
    })
    betaOwnerToken = generateToken({
      id: betaOwnerUser.id,
      email: betaOwnerUser.email,
      role: betaOwnerUser.role,
      isSuperuser: betaOwnerUser.isSuperuser,
    })

    // --- Vendedor: plain USER, member of Acme, no cash permissions at all ---
    const vendedorEmail = `vendedor-cash-${Date.now()}@authz.test`
    const vendedorUser = await prisma.user.create({
      data: {
        email: vendedorEmail,
        password: await bcrypt.hash('password123', 10),
        firstName: 'Vendedor',
        lastName: 'CashTest',
        role: 'USER',
        isActive: true,
        isSuperuser: false,
      },
    })
    await prisma.companyMember.create({
      data: { userId: vendedorUser.id, companyId: acmeCompanyId, membershipRole: 'USER' },
    })
    await prisma.userStore.create({ data: { userId: vendedorUser.id, storeId: acmeStoreId } })
    vendedorToken = generateToken({
      id: vendedorUser.id,
      email: vendedorUser.email,
      role: vendedorUser.role,
      isSuperuser: vendedorUser.isSuperuser,
    })

    // --- Cajero: plain USER, member of Acme, granted cash-sessions perms LOCALLY ---
    const cajeroEmail = `cajero-cash-${Date.now()}@authz.test`
    const cajeroUser = await prisma.user.create({
      data: {
        email: cajeroEmail,
        password: await bcrypt.hash('password123', 10),
        firstName: 'Cajero',
        lastName: 'CashTest',
        role: 'USER',
        isActive: true,
        isSuperuser: false,
      },
    })
    cajeroUserId = cajeroUser.id
    await prisma.companyMember.create({
      data: { userId: cajeroUser.id, companyId: acmeCompanyId, membershipRole: 'USER' },
    })
    await prisma.userStore.create({ data: { userId: cajeroUser.id, storeId: acmeStoreId } })

    const openPerm = await upsertPermission('pos.cash-sessions.open', 'pos.cash-sessions', 'open')
    const closePerm = await upsertPermission('pos.cash-sessions.close', 'pos.cash-sessions', 'close')
    const readPerm = await upsertPermission('pos.cash-sessions.read', 'pos.cash-sessions', 'read')

    const cajeroRole = await prisma.role.create({
      data: { name: `Cajero POS Test ${Date.now()}`, companyId: acmeCompanyId },
    })
    await prisma.rolePermission.createMany({
      data: [openPerm, closePerm, readPerm].map((p) => ({ roleId: cajeroRole.id, permissionId: p.id })),
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

  it('OWNER creates a cash register scoped to their company/store', async () => {
    const { res, json } = await inject(app, {
      method: 'POST',
      url: '/v1/pos/cash-registers',
      headers: { Authorization: `Bearer ${ownerToken}`, 'content-type': 'application/json' },
      payload: { storeId: acmeStoreId, name: `Caja API ${Date.now()}` },
    })
    expect(res.statusCode).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.storeId).toBe(acmeStoreId)
    expect(json.data.companyId).toBe(acmeCompanyId)
  })

  it('OWNER lists cash registers scoped to a store', async () => {
    const created = await inject(app, {
      method: 'POST',
      url: '/v1/pos/cash-registers',
      headers: { Authorization: `Bearer ${ownerToken}`, 'content-type': 'application/json' },
      payload: { storeId: acmeStoreId, name: `Caja List ${Date.now()}` },
    })
    const registerId = created.json.data.id

    const { res, json } = await inject(app, {
      method: 'GET',
      url: `/v1/pos/cash-registers?storeId=${acmeStoreId}`,
      headers: { Authorization: `Bearer ${ownerToken}` },
    })
    expect(res.statusCode).toBe(200)
    expect(json.data.registers.some((r: { id: string }) => r.id === registerId)).toBe(true)
  })

  it('OWNER cannot create a register for a store outside their own company', async () => {
    const { res } = await inject(app, {
      method: 'POST',
      url: '/v1/pos/cash-registers',
      headers: { Authorization: `Bearer ${ownerToken}`, 'content-type': 'application/json' },
      payload: { storeId: betaStoreId, name: 'Cross tenant register' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('full end-to-end: open -> settle sale via direct DB write -> close with arqueo -> report', async () => {
    const created = await inject(app, {
      method: 'POST',
      url: '/v1/pos/cash-registers',
      headers: { Authorization: `Bearer ${ownerToken}`, 'content-type': 'application/json' },
      payload: { storeId: acmeStoreId, name: `Caja E2E ${Date.now()}` },
    })
    const registerId = created.json.data.id

    const opened = await inject(app, {
      method: 'POST',
      url: '/v1/pos/cash-sessions/open',
      headers: { Authorization: `Bearer ${ownerToken}`, 'content-type': 'application/json' },
      payload: { cashRegisterId: registerId, openingFloat: 1000 },
    })
    expect(opened.res.statusCode).toBe(200)
    expect(opened.json.data.status).toBe('OPEN')
    const sessionId = opened.json.data.id

    const acmeOwnerUser = await prisma.user.findUnique({ where: { email: 'gerente@acme.com' } })
    await prisma.sale.create({
      data: {
        companyId: acmeCompanyId,
        storeId: acmeStoreId,
        userId: acmeOwnerUser!.id,
        cashSessionId: sessionId,
        total: 300,
        subtotal: 300,
        tax: 0,
        status: 'COMPLETED',
        paymentMethod: 'CASH',
      },
    })

    const report = await inject(app, {
      method: 'GET',
      url: `/v1/pos/cash-sessions/${sessionId}/report`,
      headers: { Authorization: `Bearer ${ownerToken}` },
    })
    expect(report.res.statusCode).toBe(200)
    expect(report.json.data.expectedCash).toBe(1300)

    const closed = await inject(app, {
      method: 'POST',
      url: `/v1/pos/cash-sessions/${sessionId}/close`,
      headers: { Authorization: `Bearer ${ownerToken}`, 'content-type': 'application/json' },
      payload: { countedCash: 1250 },
    })
    expect(closed.res.statusCode).toBe(200)
    expect(closed.json.data.status).toBe('CLOSED')
    expect(Number(closed.json.data.expectedCash)).toBe(1300)
    expect(Number(closed.json.data.difference)).toBe(-50)
  })

  it('vendedor (no cash-session permissions) gets 403 opening a session', async () => {
    const created = await inject(app, {
      method: 'POST',
      url: '/v1/pos/cash-registers',
      headers: { Authorization: `Bearer ${ownerToken}`, 'content-type': 'application/json' },
      payload: { storeId: acmeStoreId, name: `Caja Vendedor ${Date.now()}` },
    })
    const registerId = created.json.data.id

    const { res } = await inject(app, {
      method: 'POST',
      url: '/v1/pos/cash-sessions/open',
      headers: { Authorization: `Bearer ${vendedorToken}`, 'content-type': 'application/json', 'x-store-id': acmeStoreId },
      payload: { cashRegisterId: registerId, openingFloat: 100 },
    })
    expect(res.statusCode).toBe(403)
  })

  it('cajero (locally-granted cash-sessions perms) can open and close a session', async () => {
    const created = await inject(app, {
      method: 'POST',
      url: '/v1/pos/cash-registers',
      headers: { Authorization: `Bearer ${ownerToken}`, 'content-type': 'application/json' },
      payload: { storeId: acmeStoreId, name: `Caja Cajero ${Date.now()}` },
    })
    const registerId = created.json.data.id

    const opened = await inject(app, {
      method: 'POST',
      url: '/v1/pos/cash-sessions/open',
      headers: { Authorization: `Bearer ${cajeroToken}`, 'content-type': 'application/json', 'x-store-id': acmeStoreId },
      payload: { cashRegisterId: registerId, openingFloat: 500 },
    })
    expect(opened.res.statusCode).toBe(200)
    expect(opened.json.data.openedByUserId).toBe(cajeroUserId)

    const closed = await inject(app, {
      method: 'POST',
      url: `/v1/pos/cash-sessions/${opened.json.data.id}/close`,
      headers: { Authorization: `Bearer ${cajeroToken}`, 'content-type': 'application/json', 'x-store-id': acmeStoreId },
      payload: { countedCash: 500 },
    })
    expect(closed.res.statusCode).toBe(200)
    expect(closed.json.data.status).toBe('CLOSED')
  })

  it('a store-scoped user cannot open a session for a register outside their assigned store', async () => {
    const created = await inject(app, {
      method: 'POST',
      url: '/v1/pos/cash-registers',
      headers: { Authorization: `Bearer ${ownerToken}`, 'content-type': 'application/json' },
      payload: { storeId: acmeStoreBId, name: `Caja StoreB ${Date.now()}` },
    })
    const registerId = created.json.data.id

    const { res } = await inject(app, {
      method: 'POST',
      url: '/v1/pos/cash-sessions/open',
      headers: { Authorization: `Bearer ${cajeroToken}`, 'content-type': 'application/json', 'x-store-id': acmeStoreId },
      payload: { cashRegisterId: registerId, openingFloat: 100 },
    })
    expect(res.statusCode).toBe(403)
  })

  it('cross-tenant: Beta owner cannot open a session on an Acme register', async () => {
    const created = await inject(app, {
      method: 'POST',
      url: '/v1/pos/cash-registers',
      headers: { Authorization: `Bearer ${ownerToken}`, 'content-type': 'application/json' },
      payload: { storeId: acmeStoreId, name: `Caja CrossTenant ${Date.now()}` },
    })
    const registerId = created.json.data.id

    const { res } = await inject(app, {
      method: 'POST',
      url: '/v1/pos/cash-sessions/open',
      headers: { Authorization: `Bearer ${betaOwnerToken}`, 'content-type': 'application/json' },
      payload: { cashRegisterId: registerId, openingFloat: 100 },
    })
    expect(res.statusCode).toBe(404)
  })

  it('rejects opening a second session on an already-open register (409)', async () => {
    const created = await inject(app, {
      method: 'POST',
      url: '/v1/pos/cash-registers',
      headers: { Authorization: `Bearer ${ownerToken}`, 'content-type': 'application/json' },
      payload: { storeId: acmeStoreId, name: `Caja Conflict ${Date.now()}` },
    })
    const registerId = created.json.data.id

    await inject(app, {
      method: 'POST',
      url: '/v1/pos/cash-sessions/open',
      headers: { Authorization: `Bearer ${ownerToken}`, 'content-type': 'application/json' },
      payload: { cashRegisterId: registerId, openingFloat: 100 },
    })

    const { res } = await inject(app, {
      method: 'POST',
      url: '/v1/pos/cash-sessions/open',
      headers: { Authorization: `Bearer ${ownerToken}`, 'content-type': 'application/json' },
      payload: { cashRegisterId: registerId, openingFloat: 100 },
    })
    expect(res.statusCode).toBe(409)
  })
})
