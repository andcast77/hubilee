import { beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '@/db'

import './setup'

describe('PLAN-13: tenant integrity via composite FKs', () => {
  let acmeCompanyId: string
  let betaCompanyId: string
  let acmeStoreIds: [string, string]
  let acmeProductId: string
  let acmeCustomerId: string
  let acmeSaleId: string
  let betaUserId: string

  beforeAll(async () => {
    const acme = await prisma.company.findFirst({ where: { name: 'Acme Inc.' }, select: { id: true } })
    const beta = await prisma.company.findFirst({ where: { name: 'Beta Corp.' }, select: { id: true } })
    if (!acme || !beta) throw new Error('Missing seeded companies')
    acmeCompanyId = acme.id
    betaCompanyId = beta.id

    const acmeStores = await prisma.store.findMany({
      where: { companyId: acmeCompanyId },
      orderBy: { createdAt: 'asc' },
      take: 2,
      select: { id: true },
    })
    if (acmeStores.length < 2) throw new Error('Missing seeded Acme stores')
    acmeStoreIds = [acmeStores[0]!.id, acmeStores[1]!.id]

    const acmeProduct = await prisma.product.findFirst({
      where: { companyId: acmeCompanyId },
      select: { id: true },
    })
    if (!acmeProduct) throw new Error('Missing seeded Acme product')
    acmeProductId = acmeProduct.id

    const acmeCustomer = await prisma.customer.findFirst({
      where: { companyId: acmeCompanyId },
      select: { id: true },
    })
    if (!acmeCustomer) throw new Error('Missing seeded Acme customer')
    acmeCustomerId = acmeCustomer.id

    const acmeSale = await prisma.sale.findFirst({
      where: { companyId: acmeCompanyId },
      select: { id: true },
    })
    if (!acmeSale) throw new Error('Missing seeded Acme sale')
    acmeSaleId = acmeSale.id

    const betaUser = await prisma.user.findUnique({
      where: { email: 'gerente@betacorp.com' },
      select: { id: true },
    })
    if (!betaUser) throw new Error('Missing seeded Beta user')
    betaUserId = betaUser.id
  }, 30_000)

  it('rejects cross-tenant InventoryTransfer relation injection', async () => {
    const promise = prisma.inventoryTransfer.create({
      data: {
        companyId: betaCompanyId,
        fromStoreId: acmeStoreIds[0],
        toStoreId: acmeStoreIds[1],
        productId: acmeProductId,
        quantity: 1,
        createdById: betaUserId,
        status: 'PENDING',
      },
    })
    await expect(promise).rejects.toMatchObject({ code: 'P2003' })
  })

  it('rejects cross-tenant Sale store/customer relation injection', async () => {
    const promise = prisma.sale.create({
      data: {
        companyId: betaCompanyId,
        storeId: acmeStoreIds[0],
        customerId: acmeCustomerId,
        userId: betaUserId,
        invoiceNumber: `BETA-XTENANT-${Date.now()}`,
        total: 10,
        subtotal: 10,
        tax: 0,
        status: 'COMPLETED',
      },
    })
    await expect(promise).rejects.toMatchObject({ code: 'P2003' })
  })

  it('rejects cross-tenant LoyaltyPoint sale/customer relation injection', async () => {
    const promise = prisma.loyaltyPoint.create({
      data: {
        companyId: betaCompanyId,
        customerId: acmeCustomerId,
        saleId: acmeSaleId,
        points: 5,
        type: 'EARNED',
      },
    })
    await expect(promise).rejects.toMatchObject({ code: 'P2003' })
  })
})
