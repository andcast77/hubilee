/**
 * PLAN-13 Task 8: Cross-tenant mutation isolation regression tests.
 * Verifies that Beta user cannot mutate Acme resources (products, customers, suppliers, inventory transfers).
 * Expects 404 when cross-tenant IDs are used (resource not found in tenant scope).
 */
import { describe, it, expect, beforeAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { prisma } from '@/db'
import { Buffer } from 'node:buffer'

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
    try {
      return JSON.parse(payload)
    } catch {
      return payload
    }
  }
  if (Buffer.isBuffer(payload)) return JSON.parse(payload.toString('utf8'))
  if (payload instanceof Uint8Array) return JSON.parse(Buffer.from(payload).toString('utf8'))
  if (typeof payload === 'object') return payload
  return JSON.parse(String(payload))
}

async function injectJson(app: FastifyInstance, opts: any) {
  const res = await app.inject(opts)
  return { res: res as unknown as InjectResult, json: getJsonPayload(res as unknown as InjectResult) }
}

describe('PLAN-13 Task 8: Pos Tenant Mutation Isolation', () => {
  let app: FastifyInstance

  let acmeCompanyId: string
  let acmeProductId: string
  let acmeCustomerId: string
  let acmeSupplierId: string
  let acmeTransferId: string
  let acmeStore1Id: string
  let acmeStore2Id: string

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
    if (!acmeOwnerUser || !betaOwnerUser) throw new Error('Missing seeded pos users')

    acmeOwnerToken = generateToken({
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

    const acmeCustomer = await prisma.customer.findFirst({
      where: { companyId: acmeCompanyId },
      select: { id: true },
    })
    if (!acmeCustomer) throw new Error('Missing seeded Acme customers')
    acmeCustomerId = acmeCustomer.id

    const acmeSupplier = await prisma.supplier.findFirst({
      where: { companyId: acmeCompanyId },
      select: { id: true },
    })
    if (!acmeSupplier) throw new Error('Missing seeded Acme suppliers')
    acmeSupplierId = acmeSupplier.id

    const acmeStores = await prisma.store.findMany({
      where: { companyId: acmeCompanyId },
      take: 2,
      select: { id: true },
      orderBy: { id: 'asc' },
    })
    if (acmeStores.length < 2) throw new Error('Missing Acme stores for transfer')
    acmeStore1Id = acmeStores[0]!.id
    acmeStore2Id = acmeStores[1]!.id

    const invWithStock = await prisma.storeInventory.findFirst({
      where: { storeId: acmeStore1Id, quantity: { gte: 1 } },
      select: { productId: true },
    })
    if (!invWithStock) throw new Error('Missing inventory with stock at Acme store 1 for transfer test')
    acmeProductId = invWithStock.productId

    // Create a PENDING transfer (seeded ones are COMPLETED; we need PENDING for complete/cancel tests)
    const { res: createTransferRes, json: createTransferJson } = await injectJson(app, {
      method: 'POST',
      url: '/v1/pos/inventory-transfers',
      headers: {
        Authorization: `Bearer ${acmeOwnerToken}`,
        'content-type': 'application/json',
      },
      payload: {
        fromStoreId: acmeStore1Id,
        toStoreId: acmeStore2Id,
        productId: acmeProductId,
        quantity: 1,
        notes: 'PLAN-13 test transfer',
        createdById: acmeOwnerUser.id,
      },
    })
    if (createTransferRes.statusCode !== 200 || !createTransferJson?.data?.id) {
      throw new Error(
        `Failed to create Acme transfer: ${createTransferRes.statusCode} ${JSON.stringify(createTransferJson)}`
      )
    }
    acmeTransferId = createTransferJson.data.id
  }, 30_000)

  it('Beta user cannot update Acme product (returns 404)', async () => {
    const { res } = await injectJson(app, {
      method: 'PUT',
      url: `/v1/pos/products/${acmeProductId}`,
      headers: {
        Authorization: `Bearer ${betaOwnerToken}`,
        'content-type': 'application/json',
      },
      payload: { name: 'Hacked by Beta' },
    })
    expect(res.statusCode).toBe(404)
  })

  it('Beta user cannot delete Acme product (returns 404)', async () => {
    const { res } = await injectJson(app, {
      method: 'DELETE',
      url: `/v1/pos/products/${acmeProductId}`,
      headers: { Authorization: `Bearer ${betaOwnerToken}` },
    })
    expect(res.statusCode).toBe(404)
  })

  it('Beta user cannot update Acme customer (returns 404)', async () => {
    const { res } = await injectJson(app, {
      method: 'PUT',
      url: `/v1/pos/customers/${acmeCustomerId}`,
      headers: {
        Authorization: `Bearer ${betaOwnerToken}`,
        'content-type': 'application/json',
      },
      payload: { name: 'Hacked by Beta' },
    })
    expect(res.statusCode).toBe(404)
  })

  it('Beta user cannot delete Acme customer (returns 404)', async () => {
    const { res } = await injectJson(app, {
      method: 'DELETE',
      url: `/v1/pos/customers/${acmeCustomerId}`,
      headers: { Authorization: `Bearer ${betaOwnerToken}` },
    })
    expect(res.statusCode).toBe(404)
  })

  it('Beta user cannot update Acme supplier (returns 404)', async () => {
    const { res } = await injectJson(app, {
      method: 'PUT',
      url: `/v1/pos/suppliers/${acmeSupplierId}`,
      headers: {
        Authorization: `Bearer ${betaOwnerToken}`,
        'content-type': 'application/json',
      },
      payload: { name: 'Hacked by Beta' },
    })
    expect(res.statusCode).toBe(404)
  })

  it('Beta user cannot delete Acme supplier (returns 404)', async () => {
    const { res } = await injectJson(app, {
      method: 'DELETE',
      url: `/v1/pos/suppliers/${acmeSupplierId}`,
      headers: { Authorization: `Bearer ${betaOwnerToken}` },
    })
    expect(res.statusCode).toBe(404)
  })

  it('Beta user cannot complete Acme inventory transfer (returns 404)', async () => {
    const { res } = await injectJson(app, {
      method: 'POST',
      url: `/v1/pos/inventory-transfers/${acmeTransferId}/complete`,
      headers: { Authorization: `Bearer ${betaOwnerToken}` },
    })
    expect(res.statusCode).toBe(404)
  })

  it('Beta user cannot cancel Acme inventory transfer (returns 404)', async () => {
    const { res } = await injectJson(app, {
      method: 'POST',
      url: `/v1/pos/inventory-transfers/${acmeTransferId}/cancel`,
      headers: { Authorization: `Bearer ${betaOwnerToken}` },
    })
    expect(res.statusCode).toBe(404)
  })
})
