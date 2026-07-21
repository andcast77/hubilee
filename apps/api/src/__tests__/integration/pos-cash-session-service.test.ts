/**
 * POS Cash Session (PR2): caja domain service — open/close/arqueo math + tenant/store guards.
 * Exercises `services/pos-cash.service.ts` directly (no HTTP layer — that's covered by
 * pos-cash-session-api.test.ts).
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { prisma } from '@/db'

import './setup'

import * as cashService from '../../services/pos-cash.service.js'
import { NotFoundError, BadRequestError, ForbiddenError, ConflictError } from '../../common/errors/index.js'
import type { PosContext } from '../../core/auth-context.js'

describe('Pos cash session service: open/close arqueo + guards', () => {
  let acmeCompanyId: string
  let betaCompanyId: string
  let acmeStoreId: string
  let acmeStoreBId: string
  let acmeUserId: string

  let fullAccessCtx: PosContext
  let betaCtx: PosContext

  async function createRegister(storeId = acmeStoreId) {
    return cashService.createCashRegister(fullAccessCtx, { storeId, name: `Caja ${Date.now()}-${Math.random()}` })
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

  async function createCashSale(opts: {
    storeId: string
    cashSessionId: string
    paymentMethod: 'CASH' | 'CARD' | 'TRANSFER' | 'CHECK' | 'OTHER'
    total: number
    status?: 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED'
  }) {
    return prisma.sale.create({
      data: {
        companyId: acmeCompanyId,
        storeId: opts.storeId,
        userId: acmeUserId,
        cashSessionId: opts.cashSessionId,
        total: opts.total,
        subtotal: opts.total,
        tax: 0,
        status: opts.status ?? 'COMPLETED',
        paymentMethod: opts.paymentMethod,
      },
    })
  }

  describe('open', () => {
    it('opens a session with the given opening float', async () => {
      const register = await createRegister()
      const session = await cashService.openCashSession(fullAccessCtx, {
        cashRegisterId: register.id,
        openingFloat: 1000,
      })
      expect(session.status).toBe('OPEN')
      expect(Number(session.openingFloat)).toBe(1000)
      expect(session.cashRegisterId).toBe(register.id)
      expect(session.openedByUserId).toBe(acmeUserId)
    })

    it('rejects opening a second session on an already-open register', async () => {
      const register = await createRegister()
      await cashService.openCashSession(fullAccessCtx, { cashRegisterId: register.id, openingFloat: 500 })

      await expect(
        cashService.openCashSession(fullAccessCtx, { cashRegisterId: register.id, openingFloat: 500 }),
      ).rejects.toBeInstanceOf(ConflictError)
    })

    it('denies opening a session for a register belonging to another company', async () => {
      const betaStore = await prisma.store.findFirst({ where: { companyId: betaCompanyId } })
      if (!betaStore) throw new Error('Missing seeded Beta store')
      const betaRegister = await cashService.createCashRegister(betaCtx, { storeId: betaStore.id, name: `Caja Beta ${Date.now()}` })

      await expect(
        cashService.openCashSession(fullAccessCtx, { cashRegisterId: betaRegister.id, openingFloat: 100 }),
      ).rejects.toBeInstanceOf(NotFoundError)
    })

    it('denies a store-scoped user opening a session on a register outside their assigned store', async () => {
      const register = await createRegister(acmeStoreBId)
      const scopedCtx: PosContext = { ...fullAccessCtx, membershipRole: 'USER', storeId: acmeStoreId }

      await expect(
        cashService.openCashSession(scopedCtx, { cashRegisterId: register.id, openingFloat: 100 }),
      ).rejects.toBeInstanceOf(ForbiddenError)
    })
  })

  describe('close (arqueo)', () => {
    it('computes expectedCash = openingFloat + CASH sales and difference = 0 on exact match', async () => {
      const register = await createRegister()
      const session = await cashService.openCashSession(fullAccessCtx, { cashRegisterId: register.id, openingFloat: 1000 })
      await createCashSale({ storeId: acmeStoreId, cashSessionId: session.id, paymentMethod: 'CASH', total: 300 })
      await createCashSale({ storeId: acmeStoreId, cashSessionId: session.id, paymentMethod: 'CASH', total: 200 })
      // Non-cash sales must not affect expectedCash.
      await createCashSale({ storeId: acmeStoreId, cashSessionId: session.id, paymentMethod: 'CARD', total: 900 })

      const closed = await cashService.closeCashSession(fullAccessCtx, session.id, { countedCash: 1500 })

      expect(closed.status).toBe('CLOSED')
      expect(Number(closed.expectedCash)).toBe(1500)
      expect(Number(closed.countedCash)).toBe(1500)
      expect(Number(closed.difference)).toBe(0)
    })

    it('records a negative difference (faltante) and still closes the session', async () => {
      const register = await createRegister()
      const session = await cashService.openCashSession(fullAccessCtx, { cashRegisterId: register.id, openingFloat: 1000 })
      await createCashSale({ storeId: acmeStoreId, cashSessionId: session.id, paymentMethod: 'CASH', total: 500 })

      const closed = await cashService.closeCashSession(fullAccessCtx, session.id, { countedCash: 1450 })

      expect(closed.status).toBe('CLOSED')
      expect(Number(closed.expectedCash)).toBe(1500)
      expect(Number(closed.difference)).toBe(-50)
    })

    it('records a positive difference (sobra) and still closes the session', async () => {
      const register = await createRegister()
      const session = await cashService.openCashSession(fullAccessCtx, { cashRegisterId: register.id, openingFloat: 1000 })

      const closed = await cashService.closeCashSession(fullAccessCtx, session.id, { countedCash: 1050 })

      expect(closed.status).toBe('CLOSED')
      expect(Number(closed.expectedCash)).toBe(1000)
      expect(Number(closed.difference)).toBe(50)
    })

    it('excludes CANCELLED/REFUNDED cash sales from expectedCash', async () => {
      const register = await createRegister()
      const session = await cashService.openCashSession(fullAccessCtx, { cashRegisterId: register.id, openingFloat: 0 })
      await createCashSale({ storeId: acmeStoreId, cashSessionId: session.id, paymentMethod: 'CASH', total: 400, status: 'COMPLETED' })
      await createCashSale({ storeId: acmeStoreId, cashSessionId: session.id, paymentMethod: 'CASH', total: 999, status: 'CANCELLED' })
      await createCashSale({ storeId: acmeStoreId, cashSessionId: session.id, paymentMethod: 'CASH', total: 111, status: 'REFUNDED' })

      const closed = await cashService.closeCashSession(fullAccessCtx, session.id, { countedCash: 400 })

      expect(Number(closed.expectedCash)).toBe(400)
      expect(Number(closed.difference)).toBe(0)
    })

    it('rejects closing an already-CLOSED session', async () => {
      const register = await createRegister()
      const session = await cashService.openCashSession(fullAccessCtx, { cashRegisterId: register.id, openingFloat: 100 })
      await cashService.closeCashSession(fullAccessCtx, session.id, { countedCash: 100 })

      await expect(
        cashService.closeCashSession(fullAccessCtx, session.id, { countedCash: 100 }),
      ).rejects.toBeInstanceOf(BadRequestError)
    })

    it('denies a store-scoped user closing a session outside their assigned store', async () => {
      const register = await createRegister(acmeStoreBId)
      const session = await cashService.openCashSession(fullAccessCtx, { cashRegisterId: register.id, openingFloat: 100 })
      const scopedCtx: PosContext = { ...fullAccessCtx, membershipRole: 'USER', storeId: acmeStoreId }

      await expect(
        cashService.closeCashSession(scopedCtx, session.id, { countedCash: 100 }),
      ).rejects.toBeInstanceOf(ForbiddenError)
    })

    it('denies closing a session belonging to another company', async () => {
      const betaStore = await prisma.store.findFirst({ where: { companyId: betaCompanyId } })
      if (!betaStore) throw new Error('Missing seeded Beta store')
      const betaRegister = await cashService.createCashRegister(betaCtx, { storeId: betaStore.id, name: `Caja Beta ${Date.now()}` })
      const betaSession = await cashService.openCashSession(betaCtx, { cashRegisterId: betaRegister.id, openingFloat: 100 })

      await expect(
        cashService.closeCashSession(fullAccessCtx, betaSession.id, { countedCash: 100 }),
      ).rejects.toBeInstanceOf(NotFoundError)
    })
  })

  describe('report', () => {
    it('breaks down sales by payment method and previews expectedCash for an OPEN session', async () => {
      const register = await createRegister()
      const session = await cashService.openCashSession(fullAccessCtx, { cashRegisterId: register.id, openingFloat: 200 })
      await createCashSale({ storeId: acmeStoreId, cashSessionId: session.id, paymentMethod: 'CASH', total: 100 })
      await createCashSale({ storeId: acmeStoreId, cashSessionId: session.id, paymentMethod: 'CARD', total: 250 })

      const report = await cashService.getCashSessionReport(fullAccessCtx, session.id)

      expect(report.session.id).toBe(session.id)
      expect(report.salesCount).toBe(2)
      expect(report.openingFloat).toBe(200)
      expect(report.cashSalesTotal).toBe(100)
      expect(report.expectedCash).toBe(300)
      expect(report.countedCash).toBeNull()
      expect(report.difference).toBeNull()
      const cardRow = report.paymentBreakdown.find((r) => r.paymentMethod === 'CARD')
      expect(cardRow?.total).toBe(250)
      expect(cardRow?.count).toBe(1)
    })

    it('returns the persisted arqueo (expectedCash/countedCash/difference) for a CLOSED session', async () => {
      const register = await createRegister()
      const session = await cashService.openCashSession(fullAccessCtx, { cashRegisterId: register.id, openingFloat: 200 })
      await createCashSale({ storeId: acmeStoreId, cashSessionId: session.id, paymentMethod: 'CASH', total: 100 })
      await cashService.closeCashSession(fullAccessCtx, session.id, { countedCash: 250 })

      const report = await cashService.getCashSessionReport(fullAccessCtx, session.id)

      expect(report.expectedCash).toBe(300)
      expect(report.countedCash).toBe(250)
      expect(report.difference).toBe(-50)
    })
  })

  describe('registers + list', () => {
    it('lists only registers for the requested store within the tenant', async () => {
      const registerA = await createRegister(acmeStoreId)
      const registerB = await createRegister(acmeStoreBId)

      const storeAList = await cashService.listCashRegisters(fullAccessCtx, { storeId: acmeStoreId })
      expect(storeAList.some((r) => r.id === registerA.id)).toBe(true)
      expect(storeAList.some((r) => r.id === registerB.id)).toBe(false)
    })

    it('lists sessions scoped to the tenant/store', async () => {
      const register = await createRegister()
      const session = await cashService.openCashSession(fullAccessCtx, { cashRegisterId: register.id, openingFloat: 50 })

      const sessions = await cashService.listCashSessions(fullAccessCtx, { storeId: acmeStoreId, status: 'OPEN' })
      expect(sessions.some((s) => s.id === session.id)).toBe(true)
    })
  })
})
