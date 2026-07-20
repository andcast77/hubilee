import { describe, it, expect, beforeAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { prisma } from '@hubilee/database'
import { Buffer } from 'node:buffer'
import { randomUUID } from 'node:crypto'

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

describe('Plan 8 / Task 2: Pos Tenant Isolation', () => {
  let app: FastifyInstance

  let acmeCompanyId: string
  let betaCompanyId: string

  let acmeOwnerToken: string
  let betaOwnerToken: string
  let betaOwnerUserId: string

  let acmeOriginalPointsPerDollar: number
  let betaOriginalPointsPerDollar: number
  let acmeOriginalStoreName: string
  let betaOriginalStoreName: string

  let betaCustomerId: string

  beforeAll(async () => {
    const mod = await import('../../server.js')
    app = mod.default as FastifyInstance

    const acme = await prisma.company.findFirst({ where: { name: 'Acme Inc.' } })
    const beta = await prisma.company.findFirst({ where: { name: 'Beta Corp.' } })
    if (!acme || !beta) throw new Error('Missing seeded companies (Acme Inc., Beta Corp.)')
    acmeCompanyId = acme.id
    betaCompanyId = beta.id

    const acmeOwnerUser = await prisma.user.findUnique({ where: { email: 'gerente@acme.com' } })
    const betaOwnerUser = await prisma.user.findUnique({ where: { email: 'gerente@betacorp.com' } })
    if (!acmeOwnerUser || !betaOwnerUser) throw new Error('Missing seeded pos users')
    betaOwnerUserId = betaOwnerUser.id

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

    const acmeConfig = await prisma.loyaltyConfig.findFirst({
      where: { companyId: acmeCompanyId, isActive: true },
      orderBy: { createdAt: 'desc' },
      select: { pointsPerDollar: true },
    })
    if (!acmeConfig) throw new Error('Missing seeded Acme loyalty config')
    acmeOriginalPointsPerDollar = Number(acmeConfig.pointsPerDollar)

    const betaCustomer = await prisma.customer.findFirst({
      where: { companyId: betaCompanyId },
      select: { id: true },
    })
    if (!betaCustomer) throw new Error('Missing seeded Beta customers')
    betaCustomerId = betaCustomer.id

    // Capture baseline via API to validate endpoint itself.
    const { res: betaGetRes, json: betaGetJson } = await injectJson(app, {
      method: 'GET',
      url: '/v1/pos/loyalty/config',
      headers: { Authorization: `Bearer ${betaOwnerToken}` },
    })
    expect(betaGetRes.statusCode).toBe(200)
    betaOriginalPointsPerDollar = betaGetJson.data.pointsPerDollar

    const { res: acmeStoreConfigRes, json: acmeStoreConfigJson } = await injectJson(app, {
      method: 'GET',
      url: '/v1/pos/store-config',
      headers: { Authorization: `Bearer ${acmeOwnerToken}` },
    })
    expect(acmeStoreConfigRes.statusCode).toBe(200)
    acmeOriginalStoreName = acmeStoreConfigJson.data.name

    const { res: betaStoreConfigRes, json: betaStoreConfigJson } = await injectJson(app, {
      method: 'GET',
      url: '/v1/pos/store-config',
      headers: { Authorization: `Bearer ${betaOwnerToken}` },
    })
    expect(betaStoreConfigRes.statusCode).toBe(200)
    betaOriginalStoreName = betaStoreConfigJson.data.name
  })

  it('Cross-tenant loyalty config reads/writes are isolated', async () => {
    const updatedPointsPerDollar = acmeOriginalPointsPerDollar + 2

    const { res: acmeUpdateRes, json: acmeUpdateJson } = await injectJson(app, {
      method: 'PUT',
      url: '/v1/pos/loyalty/config',
      headers: { Authorization: `Bearer ${acmeOwnerToken}`, 'content-type': 'application/json' },
      payload: { pointsPerDollar: updatedPointsPerDollar },
    })
    expect(acmeUpdateRes.statusCode).toBe(200)
    expect(acmeUpdateJson.data.pointsPerDollar).toBe(updatedPointsPerDollar)

    const { json: acmeGetJson } = await injectJson(app, {
      method: 'GET',
      url: '/v1/pos/loyalty/config',
      headers: { Authorization: `Bearer ${acmeOwnerToken}` },
    })
    expect(acmeGetJson.data.pointsPerDollar).toBe(updatedPointsPerDollar)

    const { json: betaGetJsonAfter } = await injectJson(app, {
      method: 'GET',
      url: '/v1/pos/loyalty/config',
      headers: { Authorization: `Bearer ${betaOwnerToken}` },
    })
    expect(betaGetJsonAfter.data.pointsPerDollar).toBe(betaOriginalPointsPerDollar)

    // Cleanup: revert Acme back to original configuration.
    const { res: revertRes } = await injectJson(app, {
      method: 'PUT',
      url: '/v1/pos/loyalty/config',
      headers: { Authorization: `Bearer ${acmeOwnerToken}`, 'content-type': 'application/json' },
      payload: { pointsPerDollar: acmeOriginalPointsPerDollar },
    })
    expect(revertRes.statusCode).toBe(200)
  })

  it('Cross-tenant customer points lookup does not leak resource existence', async () => {
    const { res, json } = await injectJson(app, {
      method: 'GET',
      url: `/v1/pos/loyalty/points/${betaCustomerId}`,
      headers: { Authorization: `Bearer ${acmeOwnerToken}` },
    })

    expect(res.statusCode).toBe(404)
    expect(json.message).toBe('Cliente no encontrado')
  })

  it('Cross-tenant award points is rejected as customer not found', async () => {
    const { res, json } = await injectJson(app, {
      method: 'POST',
      url: '/v1/pos/loyalty/points/award',
      headers: { Authorization: `Bearer ${acmeOwnerToken}`, 'content-type': 'application/json' },
      payload: {
        customerId: betaCustomerId,
        purchaseAmount: 150,
        saleId: randomUUID(),
      },
    })

    expect(res.statusCode).toBe(404)
    expect(json.message).toBe('Cliente no encontrado')
  })

  it('Cross-tenant user preferences access is forbidden', async () => {
    const { res, json } = await injectJson(app, {
      method: 'GET',
      url: `/v1/pos/user-preferences/${betaOwnerUserId}`,
      headers: { Authorization: `Bearer ${acmeOwnerToken}` },
    })

    expect(res.statusCode).toBe(403)
    expect(json.message).toBe('No tienes acceso a las preferencias de este usuario')
  })

  it('Cross-tenant store config reads/writes are isolated', async () => {
    const updatedName = `Acme Store ${Date.now()}`
    const { res: acmeUpdateRes, json: acmeUpdateJson } = await injectJson(app, {
      method: 'PUT',
      url: '/v1/pos/store-config',
      headers: { Authorization: `Bearer ${acmeOwnerToken}`, 'content-type': 'application/json' },
      payload: { name: updatedName },
    })
    expect(acmeUpdateRes.statusCode).toBe(200)
    expect(acmeUpdateJson.data.name).toBe(updatedName)

    const { res: betaGetRes, json: betaGetJson } = await injectJson(app, {
      method: 'GET',
      url: '/v1/pos/store-config',
      headers: { Authorization: `Bearer ${betaOwnerToken}` },
    })
    expect(betaGetRes.statusCode).toBe(200)
    expect(betaGetJson.data.name).toBe(betaOriginalStoreName)

    const { res: revertRes } = await injectJson(app, {
      method: 'PUT',
      url: '/v1/pos/store-config',
      headers: { Authorization: `Bearer ${acmeOwnerToken}`, 'content-type': 'application/json' },
      payload: { name: acmeOriginalStoreName },
    })
    expect(revertRes.statusCode).toBe(200)
  })

  it('Push subscription deletion is forbidden across users', async () => {
    const endpoint = `https://push.example/${randomUUID()}`
    const { res: createRes } = await injectJson(app, {
      method: 'POST',
      url: '/v1/pos/push-subscriptions',
      headers: { Authorization: `Bearer ${betaOwnerToken}`, 'content-type': 'application/json' },
      payload: { endpoint, p256dh: 'p256dh-value', auth: 'auth-value' },
    })
    expect(createRes.statusCode).toBe(200)

    const { res: forbiddenDeleteRes, json: forbiddenDeleteJson } = await injectJson(app, {
      method: 'DELETE',
      url: `/v1/pos/push-subscriptions?endpoint=${encodeURIComponent(endpoint)}`,
      headers: { Authorization: `Bearer ${acmeOwnerToken}` },
    })
    expect(forbiddenDeleteRes.statusCode).toBe(403)
    expect(forbiddenDeleteJson.message).toBe('Solo puedes eliminar tus propias suscripciones')

    const { res: cleanupDeleteRes } = await injectJson(app, {
      method: 'DELETE',
      url: `/v1/pos/push-subscriptions?endpoint=${encodeURIComponent(endpoint)}`,
      headers: { Authorization: `Bearer ${betaOwnerToken}` },
    })
    expect(cleanupDeleteRes.statusCode).toBe(200)
  })
})

