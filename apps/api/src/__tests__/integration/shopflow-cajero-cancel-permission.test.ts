/**
 * POS Cash Session (PR7, FIX 5): the real seeded Cajero role must include
 * `shopflow.sales.cancel` so a cashier can void/release stock for an
 * abandoned PENDING sale from the caja screens — Vendedor (create-only)
 * must NOT get this permission. Exercises the real seed.ts wiring via the
 * seeded `ventas@acme.com` user (assigned the Cajero role) rather than a
 * locally-created role, since this is specifically testing the seed grant.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
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

describe('Shopflow Cajero role: cancel permission (real seed.ts grant)', () => {
  let app: FastifyInstance
  let acmeCompanyId: string
  let acmeStoreId: string
  let acmeProductId: string
  let cajeroToken: string // ventas@acme.com — seeded with the real Cajero role

  beforeAll(async () => {
    const mod = await import('../../server.js')
    app = mod.default as FastifyInstance

    const acme = await prisma.company.findFirst({ where: { name: 'Acme Inc.' } })
    if (!acme) throw new Error('Missing seeded Acme company')
    acmeCompanyId = acme.id

    const acmeStore = await prisma.store.findFirst({ where: { companyId: acmeCompanyId } })
    if (!acmeStore) throw new Error('Missing seeded Acme store')
    acmeStoreId = acmeStore.id

    const cajeroUser = await prisma.user.findUnique({ where: { email: 'ventas@acme.com' } })
    if (!cajeroUser) throw new Error('Missing seeded ventas@acme.com (Cajero) user')
    cajeroToken = generateToken({
      id: cajeroUser.id,
      email: cajeroUser.email,
      role: cajeroUser.role,
      isSuperuser: cajeroUser.isSuperuser,
    })

    const product = await prisma.product.create({
      data: { companyId: acmeCompanyId, name: `Cajero Cancel Product ${Date.now()}`, price: 50 },
    })
    acmeProductId = product.id
    await prisma.storeInventory.create({
      data: { companyId: acmeCompanyId, storeId: acmeStoreId, productId: product.id, quantity: 20 },
    })
  }, 30_000)

  it('the seeded Cajero role (ventas@acme.com) can cancel a PENDING sale and stock is restored', async () => {
    const created = await inject(app, {
      method: 'POST',
      url: '/v1/shopflow/sales',
      headers: { Authorization: `Bearer ${cajeroToken}`, 'content-type': 'application/json', 'x-store-id': acmeStoreId },
      payload: {
        storeId: acmeStoreId,
        userId: (await prisma.user.findUnique({ where: { email: 'ventas@acme.com' } }))!.id,
        items: [{ productId: acmeProductId, quantity: 3, price: 50 }],
      },
    })
    expect(created.res.statusCode).toBe(200)
    expect(created.json.data.status).toBe('PENDING')
    const saleId = created.json.data.id as string

    const inventoryAfterCreate = await prisma.storeInventory.findUnique({
      where: { storeId_productId: { storeId: acmeStoreId, productId: acmeProductId } },
    })
    expect(inventoryAfterCreate?.quantity).toBe(17)

    const { res, json } = await inject(app, {
      method: 'POST',
      url: `/v1/shopflow/sales/${saleId}/cancel`,
      headers: { Authorization: `Bearer ${cajeroToken}`, 'content-type': 'application/json', 'x-store-id': acmeStoreId },
      payload: {},
    })
    expect(res.statusCode).toBe(200)
    expect(json.data.status).toBe('CANCELLED')

    const inventoryAfterCancel = await prisma.storeInventory.findUnique({
      where: { storeId_productId: { storeId: acmeStoreId, productId: acmeProductId } },
    })
    expect(inventoryAfterCancel?.quantity).toBe(20)
  })
})
