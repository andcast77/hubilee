import { describe, it, expect, beforeAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { prisma } from '@hubilee/database'

import './setup'

import { generateToken } from '../../core/auth.js'

describe('Plan 10: Shopflow store authorization boundaries', () => {
  let app: FastifyInstance

  let acmeCompanyId: string
  let betaCompanyId: string
  let acmeStoreAId: string
  let acmeStoreBId: string
  let betaStoreId: string

  let scopedUserId: string
  let scopedUserToken: string

  beforeAll(async () => {
    const mod = await import('../../server.js')
    app = mod.default as FastifyInstance

    const acme = await prisma.company.findFirst({ where: { name: 'Acme Inc.' }, select: { id: true } })
    const beta = await prisma.company.findFirst({ where: { name: 'Beta Corp.' }, select: { id: true } })
    if (!acme || !beta) throw new Error('Missing seeded companies')
    acmeCompanyId = acme.id
    betaCompanyId = beta.id

    let acmeStores = await prisma.store.findMany({
      where: { companyId: acmeCompanyId, active: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, code: true },
      take: 2,
    })
    if (acmeStores.length < 2) {
      const missing = 2 - acmeStores.length
      for (let i = 0; i < missing; i++) {
        await prisma.store.create({
          data: {
            companyId: acmeCompanyId,
            name: `Acme QA Store ${Date.now()}-${i}`,
            code: `ACME-QA-${Date.now()}-${i}`,
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
    if (acmeStores.length < 2) throw new Error('Unable to provision two active Acme stores')
    acmeStoreAId = acmeStores[0].id
    acmeStoreBId = acmeStores[1].id

    const betaStore = await prisma.store.findFirst({
      where: { companyId: betaCompanyId, active: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    })
    if (!betaStore) throw new Error('Missing Beta store')
    betaStoreId = betaStore.id

    const email = `shopflow-scope-${Date.now()}@authz.test`
    const hashedPassword = await bcrypt.hash('password123', 10)
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName: 'Scoped',
        lastName: 'User',
        role: 'USER',
        isActive: true,
        isSuperuser: false,
      },
      select: { id: true, email: true, role: true, isSuperuser: true },
    })
    scopedUserId = user.id
    scopedUserToken = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      isSuperuser: user.isSuperuser,
    })

    await prisma.companyMember.create({
      data: { userId: scopedUserId, companyId: acmeCompanyId, membershipRole: 'USER' },
    })
    await prisma.userStore.upsert({
      where: { userId_storeId: { userId: scopedUserId, storeId: acmeStoreAId } },
      update: {},
      create: { userId: scopedUserId, storeId: acmeStoreAId },
    })
  })

  it('USER can access assigned store and is denied for unassigned store via X-Store-Id', async () => {
    const allowed = await app.inject({
      method: 'GET',
      url: '/v1/shopflow/sales',
      headers: { Authorization: `Bearer ${scopedUserToken}`, 'x-store-id': acmeStoreAId },
    })
    expect(allowed.statusCode).toBe(200)

    const denied = await app.inject({
      method: 'GET',
      url: '/v1/shopflow/sales',
      headers: { Authorization: `Bearer ${scopedUserToken}`, 'x-store-id': acmeStoreBId },
    })
    expect(denied.statusCode).toBe(403)
  })

  it('store assignment changes apply immediately without re-login', async () => {
    await prisma.userStore.upsert({
      where: { userId_storeId: { userId: scopedUserId, storeId: acmeStoreBId } },
      update: {},
      create: { userId: scopedUserId, storeId: acmeStoreBId },
    })

    const allowedAfterAssignment = await app.inject({
      method: 'GET',
      url: '/v1/shopflow/sales',
      headers: { Authorization: `Bearer ${scopedUserToken}`, 'x-store-id': acmeStoreBId },
    })
    expect(allowedAfterAssignment.statusCode).toBe(200)
  })

  it('membership role change USER -> ADMIN applies immediately without re-login', async () => {
    await prisma.companyMember.update({
      where: { userId_companyId: { userId: scopedUserId, companyId: acmeCompanyId } },
      data: { membershipRole: 'ADMIN' },
    })

    await prisma.userStore.deleteMany({
      where: { userId: scopedUserId, storeId: acmeStoreBId },
    })

    const allowedAsAdmin = await app.inject({
      method: 'GET',
      url: '/v1/shopflow/sales',
      headers: { Authorization: `Bearer ${scopedUserToken}`, 'x-store-id': acmeStoreBId },
    })
    expect(allowedAsAdmin.statusCode).toBe(200)
  })

  it('cross-company store header stays forbidden', async () => {
    const denied = await app.inject({
      method: 'GET',
      url: '/v1/shopflow/sales',
      headers: { Authorization: `Bearer ${scopedUserToken}`, 'x-store-id': betaStoreId },
    })
    expect(denied.statusCode).toBe(403)
  })
})
