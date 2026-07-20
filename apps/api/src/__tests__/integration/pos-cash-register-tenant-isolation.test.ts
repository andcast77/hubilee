/**
 * POS Cash Session (PR1): Prisma migration + caja domain models.
 * Verifies at the repository/DB layer (no HTTP endpoints exist yet — those land in PR3):
 * - CashRegister/CashSession reads are scoped to companyId (cross-company denied).
 * - At most one OPEN CashSession per CashRegister (enforced via partial unique index).
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { prisma } from '@hubilee/database'

import './setup'

import { CashRepository } from '../../repositories/cash.repository.js'
import { ConflictError } from '../../common/errors/index.js'

describe('Pos cash register: tenant isolation + one-open-session-per-register', () => {
  let acmeCompanyId: string
  let betaCompanyId: string
  let acmeStoreId: string
  let acmeUserId: string

  let acmeRepo: CashRepository
  let betaRepo: CashRepository

  beforeAll(async () => {
    const acme = await prisma.company.findFirst({ where: { name: 'Acme Inc.' } })
    const beta = await prisma.company.findFirst({ where: { name: 'Beta Corp.' } })
    if (!acme || !beta) throw new Error('Missing seeded companies (Acme Inc., Beta Corp.)')
    acmeCompanyId = acme.id
    betaCompanyId = beta.id

    const acmeStore = await prisma.store.findFirst({ where: { companyId: acmeCompanyId } })
    if (!acmeStore) throw new Error('Missing seeded Acme store')
    acmeStoreId = acmeStore.id

    const acmeUser = await prisma.user.findUnique({ where: { email: 'gerente@acme.com' } })
    if (!acmeUser) throw new Error('Missing seeded Acme user')
    acmeUserId = acmeUser.id

    acmeRepo = new CashRepository(prisma, acmeCompanyId)
    betaRepo = new CashRepository(prisma, betaCompanyId)
  })

  it('denies cross-company register access', async () => {
    const register = await acmeRepo.createRegister({ storeId: acmeStoreId, name: `Caja Isolation ${Date.now()}` })

    const foundByOwner = await acmeRepo.findRegisterById(register.id)
    expect(foundByOwner?.id).toBe(register.id)

    const foundCrossCompany = await betaRepo.findRegisterById(register.id)
    expect(foundCrossCompany).toBeNull()
  })

  it('denies cross-company open-session lookup', async () => {
    const register = await acmeRepo.createRegister({ storeId: acmeStoreId, name: `Caja Cross ${Date.now()}` })
    await acmeRepo.openSession({
      storeId: acmeStoreId,
      cashRegisterId: register.id,
      openedByUserId: acmeUserId,
      openingFloat: 100,
    })

    const ownerLookup = await acmeRepo.findOpenSessionByRegister(register.id)
    expect(ownerLookup?.status).toBe('OPEN')

    const crossCompanyLookup = await betaRepo.findOpenSessionByRegister(register.id)
    expect(crossCompanyLookup).toBeNull()
  })

  it('rejects opening a second session while one is already OPEN on the same register', async () => {
    const register = await acmeRepo.createRegister({ storeId: acmeStoreId, name: `Caja OneOpen ${Date.now()}` })
    await acmeRepo.openSession({
      storeId: acmeStoreId,
      cashRegisterId: register.id,
      openedByUserId: acmeUserId,
      openingFloat: 500,
    })

    await expect(
      acmeRepo.openSession({
        storeId: acmeStoreId,
        cashRegisterId: register.id,
        openedByUserId: acmeUserId,
        openingFloat: 500,
      }),
    ).rejects.toBeInstanceOf(ConflictError)

    const sessions = await acmeRepo.listSessions({ cashRegisterId: register.id, status: 'OPEN' })
    expect(sessions).toHaveLength(1)
  })

  it('allows independent OPEN sessions on different registers in the same store', async () => {
    const registerA = await acmeRepo.createRegister({ storeId: acmeStoreId, name: `Caja MultiA ${Date.now()}` })
    const registerB = await acmeRepo.createRegister({ storeId: acmeStoreId, name: `Caja MultiB ${Date.now()}` })

    await acmeRepo.openSession({ storeId: acmeStoreId, cashRegisterId: registerA.id, openedByUserId: acmeUserId, openingFloat: 200 })
    await acmeRepo.openSession({ storeId: acmeStoreId, cashRegisterId: registerB.id, openedByUserId: acmeUserId, openingFloat: 300 })

    const openA = await acmeRepo.findOpenSessionByRegister(registerA.id)
    const openB = await acmeRepo.findOpenSessionByRegister(registerB.id)
    expect(openA?.status).toBe('OPEN')
    expect(openB?.status).toBe('OPEN')
  })

  it('allows opening a new session on a register after the previous one is CLOSED', async () => {
    const register = await acmeRepo.createRegister({ storeId: acmeStoreId, name: `Caja Reopen ${Date.now()}` })
    const first = await acmeRepo.openSession({
      storeId: acmeStoreId,
      cashRegisterId: register.id,
      openedByUserId: acmeUserId,
      openingFloat: 100,
    })

    const closed = await acmeRepo.updateSession(first.id, {
      status: 'CLOSED',
      closedByUserId: acmeUserId,
      countedCash: 100,
      expectedCash: 100,
      difference: 0,
      closedAt: new Date(),
    })
    expect(closed?.status).toBe('CLOSED')

    const reopened = await acmeRepo.openSession({
      storeId: acmeStoreId,
      cashRegisterId: register.id,
      openedByUserId: acmeUserId,
      openingFloat: 150,
    })
    expect(reopened.status).toBe('OPEN')
  })

  it('rejects a second close of an already-CLOSED session instead of silently overwriting the arqueo (double-close race guard)', async () => {
    const register = await acmeRepo.createRegister({ storeId: acmeStoreId, name: `Caja DoubleClose ${Date.now()}` })
    const session = await acmeRepo.openSession({
      storeId: acmeStoreId,
      cashRegisterId: register.id,
      openedByUserId: acmeUserId,
      openingFloat: 100,
    })

    // First close (e.g. cashier A's request) succeeds normally.
    const firstClose = await acmeRepo.updateSession(session.id, {
      status: 'CLOSED',
      closedByUserId: acmeUserId,
      countedCash: 100,
      expectedCash: 100,
      difference: 0,
      closedAt: new Date(),
    })
    expect(firstClose?.status).toBe('CLOSED')

    // Second close (e.g. a concurrent request that read the session while it was still
    // OPEN, before cashier A's write landed) must be rejected — not silently applied —
    // because it would overwrite cashier A's arqueo with different counted/expected/difference values.
    await expect(
      acmeRepo.updateSession(session.id, {
        status: 'CLOSED',
        closedByUserId: acmeUserId,
        countedCash: 999,
        expectedCash: 999,
        difference: 0,
        closedAt: new Date(),
      }),
    ).rejects.toBeInstanceOf(ConflictError)

    // The arqueo from the first close must remain intact (not overwritten by the second attempt).
    const persisted = await acmeRepo.findSessionById(session.id)
    expect(Number(persisted?.countedCash)).toBe(100)
  })

  it('rejects creating a second register with the same name in the same store (FIX 1 — duplicate-register guard)', async () => {
    const name = `Caja Duplicada ${Date.now()}`
    await acmeRepo.createRegister({ storeId: acmeStoreId, name })

    await expect(acmeRepo.createRegister({ storeId: acmeStoreId, name })).rejects.toBeInstanceOf(ConflictError)
  })

  it('allows the same register name in different stores', async () => {
    const acmeStoreB = await prisma.store.findFirst({
      where: { companyId: acmeCompanyId, id: { not: acmeStoreId } },
    })
    if (!acmeStoreB) throw new Error('Missing a second seeded Acme store')

    const name = `Caja Principal Shared Name ${Date.now()}`
    const registerA = await acmeRepo.createRegister({ storeId: acmeStoreId, name })
    const registerB = await acmeRepo.createRegister({ storeId: acmeStoreB.id, name })
    expect(registerA.id).not.toBe(registerB.id)
  })
})
