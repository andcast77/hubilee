/**
 * POS Cash Session (PR4): sale lifecycle (PENDING->COMPLETED) + settlement.
 * Exercises `services/shopflow-sales.service.ts` (createSale two flows + settleSale)
 * directly — no HTTP layer (that's covered by shopflow-cash-session-api.test.ts style
 * suites; PR4 keeps the HTTP contract additive and thin).
 *
 * Ground truth preserved: createSale's stock-decrement transaction and cancelSale's
 * stock-restore transaction are NOT rewritten here — only extended with optional
 * cashSessionId/sellerId inputs. Settlement itself never touches StoreInventory.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { prisma } from '@multisystem/database'

import './setup'

import * as salesService from '../../services/shopflow-sales.service.js'
import * as cashService from '../../services/shopflow-cash.service.js'
import { NotFoundError, BadRequestError, ForbiddenError, ConflictError } from '../../common/errors/index.js'
import type { ShopflowContext } from '../../core/auth-context.js'

describe('Shopflow sale lifecycle + settlement (PR4)', () => {
  let acmeCompanyId: string
  let betaCompanyId: string
  let acmeStoreId: string
  let acmeStoreBId: string
  let acmeUserId: string
  let acmeVendedorId: string

  let fullAccessCtx: ShopflowContext
  let betaCtx: ShopflowContext

  async function createProductWithStock(quantity: number, storeId = acmeStoreId) {
    const product = await prisma.product.create({
      data: {
        companyId: acmeCompanyId,
        name: `PR4 Test Product ${Date.now()}-${Math.random()}`,
        price: 100,
      },
    })
    await prisma.storeInventory.create({
      data: { companyId: acmeCompanyId, storeId, productId: product.id, quantity },
    })
    return product
  }

  async function stockOf(productId: string, storeId = acmeStoreId) {
    const inv = await prisma.storeInventory.findUnique({
      where: { storeId_productId: { storeId, productId } },
    })
    return inv?.quantity ?? 0
  }

  async function createRegister(storeId = acmeStoreId) {
    return cashService.createCashRegister(fullAccessCtx, { storeId, name: `Caja PR4 ${Date.now()}-${Math.random()}` })
  }

  async function openSession(storeId = acmeStoreId) {
    const register = await createRegister(storeId)
    return cashService.openCashSession(fullAccessCtx, { cashRegisterId: register.id, openingFloat: 0 })
  }

  beforeAll(async () => {
    const acme = await prisma.company.findFirst({ where: { name: 'Acme Inc.' } })
    const beta = await prisma.company.findFirst({ where: { name: 'Beta Corp.' } })
    if (!acme || !beta) throw new Error('Missing seeded companies (Acme Inc., Beta Corp.)')
    acmeCompanyId = acme.id
    betaCompanyId = beta.id

    const acmeStores = await prisma.store.findMany({ where: { companyId: acmeCompanyId }, take: 2 })
    if (acmeStores.length < 2) throw new Error('Missing seeded Acme stores (need at least 2)')
    acmeStoreId = acmeStores[0].id
    acmeStoreBId = acmeStores[1].id

    const acmeUser = await prisma.user.findUnique({ where: { email: 'gerente@acme.com' } })
    if (!acmeUser) throw new Error('Missing seeded Acme user')
    acmeUserId = acmeUser.id

    const acmeVendedor = await prisma.user.findUnique({ where: { email: 'ventas@acme.com' } })
    if (!acmeVendedor) throw new Error('Missing seeded Acme vendedor user')
    acmeVendedorId = acmeVendedor.id

    fullAccessCtx = {
      userId: acmeUserId,
      companyId: acmeCompanyId,
      isSuperuser: false,
      membershipRole: 'OWNER',
      storeId: undefined,
    }
    betaCtx = {
      userId: acmeUserId,
      companyId: betaCompanyId,
      isSuperuser: false,
      membershipRole: 'OWNER',
      storeId: undefined,
    }
  })

  describe('createSale — PENDING flow (no cashSessionId)', () => {
    it('reserves stock at creation, defers the invoice number, and records the seller', async () => {
      const product = await createProductWithStock(10)
      const before = await stockOf(product.id)

      const result = await salesService.createSale(fullAccessCtx, {
        storeId: acmeStoreId,
        userId: acmeUserId,
        items: [{ productId: product.id, quantity: 3, price: 100 }],
      })

      expect(result.success).toBe(true)
      const sale = (result as { data: Record<string, unknown> }).data
      expect(sale.status).toBe('PENDING')
      expect(sale.invoiceNumber).toBeNull()
      expect(sale.sellerId).toBe(acmeUserId)
      expect(sale.cashSessionId).toBeNull()

      const after = await stockOf(product.id)
      expect(after).toBe(before - 3)
    })

    it('records an explicit sellerId distinct from the creating userId', async () => {
      const product = await createProductWithStock(5)

      const result = await salesService.createSale(fullAccessCtx, {
        storeId: acmeStoreId,
        userId: acmeUserId,
        sellerId: acmeVendedorId,
        items: [{ productId: product.id, quantity: 1, price: 100 }],
      })

      const sale = (result as { data: Record<string, unknown> }).data
      expect(sale.status).toBe('PENDING')
      expect(sale.sellerId).toBe(acmeVendedorId)
    })

    it('rejects overselling at creation and leaves StoreInventory unchanged', async () => {
      const product = await createProductWithStock(3)

      await expect(
        salesService.createSale(fullAccessCtx, {
          storeId: acmeStoreId,
          userId: acmeUserId,
          items: [{ productId: product.id, quantity: 5, price: 100 }],
        }),
      ).rejects.toBeInstanceOf(BadRequestError)

      expect(await stockOf(product.id)).toBe(3)
    })
  })

  describe('createSale — direct flow (cashSessionId present, kiosco)', () => {
    it('creates COMPLETED, ties to the caja session, assigns invoice number, decrements stock once', async () => {
      const product = await createProductWithStock(10)
      const before = await stockOf(product.id)
      const session = await openSession()

      const result = await salesService.createSale(fullAccessCtx, {
        storeId: acmeStoreId,
        userId: acmeUserId,
        cashSessionId: session.id,
        items: [{ productId: product.id, quantity: 2, price: 100 }],
        paymentMethod: 'CASH',
        paidAmount: 1_000_000,
      })

      expect(result.success).toBe(true)
      const sale = (result as { data: Record<string, unknown> }).data
      expect(sale.status).toBe('COMPLETED')
      expect(sale.cashSessionId).toBe(session.id)
      expect(sale.invoiceNumber).not.toBeNull()
      expect(sale.sellerId).toBe(acmeUserId)

      const after = await stockOf(product.id)
      expect(after).toBe(before - 2)
    })

    it('rejects direct creation when the referenced session is not OPEN', async () => {
      const product = await createProductWithStock(10)
      const register = await createRegister()
      const session = await cashService.openCashSession(fullAccessCtx, { cashRegisterId: register.id, openingFloat: 0 })
      await cashService.closeCashSession(fullAccessCtx, session.id, { countedCash: 0 })

      await expect(
        salesService.createSale(fullAccessCtx, {
          storeId: acmeStoreId,
          userId: acmeUserId,
          cashSessionId: session.id,
          items: [{ productId: product.id, quantity: 1, price: 100 }],
          paymentMethod: 'CASH',
          paidAmount: 100,
        }),
      ).rejects.toBeInstanceOf(BadRequestError)
    })
  })

  describe('settleSale — PENDING -> COMPLETED', () => {
    it('attaches the caja session, assigns the invoice number, and does NOT move stock again', async () => {
      const product = await createProductWithStock(10)
      const afterCreate = { quantity: 0 }

      const pending = await salesService.createSale(fullAccessCtx, {
        storeId: acmeStoreId,
        userId: acmeUserId,
        sellerId: acmeVendedorId,
        items: [{ productId: product.id, quantity: 4, price: 100 }],
      })
      const pendingSale = (pending as { data: Record<string, unknown> }).data
      afterCreate.quantity = await stockOf(product.id)
      expect(pendingSale.invoiceNumber).toBeNull()

      const session = await openSession()

      const settled = await salesService.settleSale(fullAccessCtx, pendingSale.id as string, {
        cashSessionId: session.id,
        paymentMethod: 'CASH',
        paidAmount: 1_000_000,
      })

      expect(settled.success).toBe(true)
      const sale = (settled as { data: Record<string, unknown> }).data
      expect(sale.status).toBe('COMPLETED')
      expect(sale.cashSessionId).toBe(session.id)
      expect(sale.invoiceNumber).not.toBeNull()
      expect(sale.sellerId).toBe(acmeVendedorId)

      const afterSettle = await stockOf(product.id)
      expect(afterSettle).toBe(afterCreate.quantity)
    })

    it('rejects re-settling an already-COMPLETED sale', async () => {
      const product = await createProductWithStock(10)
      const session = await openSession()

      const direct = await salesService.createSale(fullAccessCtx, {
        storeId: acmeStoreId,
        userId: acmeUserId,
        cashSessionId: session.id,
        items: [{ productId: product.id, quantity: 1, price: 100 }],
        paymentMethod: 'CASH',
        paidAmount: 1_000_000,
      })
      const sale = (direct as { data: Record<string, unknown> }).data

      const otherSession = await openSession()

      await expect(
        salesService.settleSale(fullAccessCtx, sale.id as string, {
          cashSessionId: otherSession.id,
          paymentMethod: 'CASH',
          paidAmount: 100,
        }),
      ).rejects.toBeInstanceOf(BadRequestError)
    })

    it('rejects settlement when the referenced session is not OPEN (no open session)', async () => {
      const product = await createProductWithStock(10)
      const pending = await salesService.createSale(fullAccessCtx, {
        storeId: acmeStoreId,
        userId: acmeUserId,
        items: [{ productId: product.id, quantity: 1, price: 100 }],
      })
      const pendingSale = (pending as { data: Record<string, unknown> }).data

      const register = await createRegister()
      const session = await cashService.openCashSession(fullAccessCtx, { cashRegisterId: register.id, openingFloat: 0 })
      await cashService.closeCashSession(fullAccessCtx, session.id, { countedCash: 0 })

      await expect(
        salesService.settleSale(fullAccessCtx, pendingSale.id as string, {
          cashSessionId: session.id,
          paymentMethod: 'CASH',
          paidAmount: 100,
        }),
      ).rejects.toBeInstanceOf(BadRequestError)
    })

    it('rejects cross-store settlement (session store differs from sale store)', async () => {
      const product = await createProductWithStock(10, acmeStoreId)
      const pending = await salesService.createSale(fullAccessCtx, {
        storeId: acmeStoreId,
        userId: acmeUserId,
        items: [{ productId: product.id, quantity: 1, price: 100 }],
      })
      const pendingSale = (pending as { data: Record<string, unknown> }).data

      const otherStoreSession = await openSession(acmeStoreBId)

      await expect(
        salesService.settleSale(fullAccessCtx, pendingSale.id as string, {
          cashSessionId: otherStoreSession.id,
          paymentMethod: 'CASH',
          paidAmount: 100,
        }),
      ).rejects.toBeInstanceOf(BadRequestError)
    })

    it('denies a store-scoped cashier settling a session outside their assigned store', async () => {
      const product = await createProductWithStock(10, acmeStoreBId)
      const pending = await salesService.createSale(fullAccessCtx, {
        storeId: acmeStoreBId,
        userId: acmeUserId,
        items: [{ productId: product.id, quantity: 1, price: 100 }],
      })
      const pendingSale = (pending as { data: Record<string, unknown> }).data

      const session = await openSession(acmeStoreBId)
      const scopedCtx: ShopflowContext = { ...fullAccessCtx, membershipRole: 'USER', storeId: acmeStoreId }

      await expect(
        salesService.settleSale(scopedCtx, pendingSale.id as string, {
          cashSessionId: session.id,
          paymentMethod: 'CASH',
          paidAmount: 100,
        }),
      ).rejects.toBeInstanceOf(ForbiddenError)
    })

    it('denies settlement of a sale belonging to another company (cross-tenant)', async () => {
      const product = await createProductWithStock(10)
      const pending = await salesService.createSale(fullAccessCtx, {
        storeId: acmeStoreId,
        userId: acmeUserId,
        items: [{ productId: product.id, quantity: 1, price: 100 }],
      })
      const pendingSale = (pending as { data: Record<string, unknown> }).data

      await expect(
        salesService.settleSale(betaCtx, pendingSale.id as string, {
          cashSessionId: 'not-a-real-session',
          paymentMethod: 'CASH',
          paidAmount: 100,
        }),
      ).rejects.toBeInstanceOf(NotFoundError)
    })
  })

  describe('cancelSale — regression: abandoned PENDING releases stock', () => {
    it('restores stock when a PENDING sale is cancelled', async () => {
      const product = await createProductWithStock(10)
      const before = await stockOf(product.id)

      const pending = await salesService.createSale(fullAccessCtx, {
        storeId: acmeStoreId,
        userId: acmeUserId,
        items: [{ productId: product.id, quantity: 4, price: 100 }],
      })
      const pendingSale = (pending as { data: Record<string, unknown> }).data
      expect(await stockOf(product.id)).toBe(before - 4)

      const cancelled = await salesService.cancelSale(fullAccessCtx, pendingSale.id as string)
      expect((cancelled as { data: { status: string } }).data.status).toBe('CANCELLED')
      expect(await stockOf(product.id)).toBe(before)
    })
  })

  // FIX A (pos-cash-session round 2, CRITICAL): `cancelSale` must reject non-PENDING sales.
  // Without this guard, a Cajero could cancel a COMPLETED cash sale in an OPEN session, pocket
  // the cash, and `sumCashSales`/`getCashSessionReport` (which only count COMPLETED sales) would
  // silently drop it from `expectedCash` — the arqueo shows zero variance. Reversing a COMPLETED
  // sale is the (higher-privilege) refund flow's job, never cancel's.
  describe('cancelSale — FIX A: scoped to PENDING sales only', () => {
    it('rejects cancelling a COMPLETED sale and leaves its stock/status untouched', async () => {
      const product = await createProductWithStock(10)
      const session = await openSession()

      const direct = await salesService.createSale(fullAccessCtx, {
        storeId: acmeStoreId,
        userId: acmeUserId,
        cashSessionId: session.id,
        items: [{ productId: product.id, quantity: 2, price: 100 }],
        paymentMethod: 'CASH',
        paidAmount: 1_000_000,
      })
      const sale = (direct as { data: Record<string, unknown> }).data
      expect(sale.status).toBe('COMPLETED')
      const stockAfterCreate = await stockOf(product.id)

      await expect(
        salesService.cancelSale(fullAccessCtx, sale.id as string),
      ).rejects.toBeInstanceOf(BadRequestError)

      // A rejected cancel must not restore stock or flip the sale's status — otherwise the cash
      // is still missing from the register while the books look untouched.
      expect(await stockOf(product.id)).toBe(stockAfterCreate)
      const unchanged = await prisma.sale.findUnique({ where: { id: sale.id as string } })
      expect(unchanged?.status).toBe('COMPLETED')
    })
  })

  // FIX B (pos-cash-session round 2, WARNING): guard against a concurrent double-cancel race.
  // Two overlapping cancels of the same PENDING sale must not both pass and both run the
  // stock-restore loop (double stock increment).
  describe('cancelSale — FIX B: double-cancel race guard', () => {
    it('rejects a concurrent second cancel of the same PENDING sale and restores stock only once', async () => {
      const product = await createProductWithStock(10)
      const before = await stockOf(product.id)

      const pending = await salesService.createSale(fullAccessCtx, {
        storeId: acmeStoreId,
        userId: acmeUserId,
        items: [{ productId: product.id, quantity: 4, price: 100 }],
      })
      const pendingSale = (pending as { data: Record<string, unknown> }).data
      expect(await stockOf(product.id)).toBe(before - 4)

      const results = await Promise.allSettled([
        salesService.cancelSale(fullAccessCtx, pendingSale.id as string),
        salesService.cancelSale(fullAccessCtx, pendingSale.id as string),
      ])

      const fulfilled = results.filter((r) => r.status === 'fulfilled')
      const rejected = results.filter((r) => r.status === 'rejected')
      expect(fulfilled).toHaveLength(1)
      expect(rejected).toHaveLength(1)
      // Whichever call loses the race is rejected — either the top-level "already processed"
      // guard (FIX A) or, when both reads land before either commit, the updateMany-level
      // status re-check (FIX B). Both are valid outcomes of a properly-guarded double-cancel;
      // what matters is exactly one winner and exactly one stock restoration.
      const reason = (rejected[0] as PromiseRejectedResult).reason
      expect(reason instanceof BadRequestError || reason instanceof ConflictError).toBe(true)

      // Stock restored exactly once, not twice.
      expect(await stockOf(product.id)).toBe(before)
    })
  })
})
