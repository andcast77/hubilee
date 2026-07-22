/**
 * PR5 / Phase 5 — cash ≠ logout + one-caja + operator switch (Strict TDD RED).
 * Specs: pos-operator-switch + one cashier one OPEN CashSession.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const mockFindRegisterById = vi.hoisted(() => vi.fn())
const mockFindOpenSessionByUser = vi.hoisted(() => vi.fn())
const mockOpenSession = vi.hoisted(() => vi.fn())

vi.mock('../../repositories/index.js', () => ({
  createRepositories: () => ({
    cash: {
      findRegisterById: mockFindRegisterById,
      findOpenSessionByUser: mockFindOpenSessionByUser,
      openSession: mockOpenSession,
    },
  }),
}))

vi.mock('../../policies/pos-authorization.policy.js', () => ({
  assertStoreBelongsToCompany: vi.fn(async () => {}),
  assertStoreMatchForScopedUser: vi.fn(),
  resolveEffectiveStoreIdForScopedUser: vi.fn(async () => 'store-1'),
}))

import { openCashSession } from '../../services/pos-cash.service.js'
import { ConflictError } from '../../common/errors/index.js'
import type { PosContext } from '../../core/auth-context.js'

const CTX: PosContext = {
  userId: 'user-cashier-1',
  companyId: 'company-1',
  isSuperuser: false,
  membershipRole: 'USER',
  storeId: 'store-1',
}

const REGISTER = {
  id: 'register-b',
  companyId: 'company-1',
  storeId: 'store-1',
  name: 'Caja B',
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('pos-cash: one OPEN CashSession per user', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFindRegisterById.mockResolvedValue(REGISTER)
    mockFindOpenSessionByUser.mockResolvedValue(null)
    mockOpenSession.mockResolvedValue({
      id: 'session-new',
      status: 'OPEN',
      cashRegisterId: REGISTER.id,
      openedByUserId: CTX.userId,
      openingFloat: 100,
    })
  })

  it('denies opening a second OPEN session when the user already has one (other register)', async () => {
    mockFindOpenSessionByUser.mockResolvedValue({
      id: 'session-open-a',
      status: 'OPEN',
      cashRegisterId: 'register-a',
      openedByUserId: CTX.userId,
    })

    await expect(
      openCashSession(CTX, { cashRegisterId: REGISTER.id, openingFloat: 50 }),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'CASH_SESSION_OPEN',
      name: 'ConflictError',
    })

    expect(mockFindOpenSessionByUser).toHaveBeenCalledWith(CTX.userId)
    expect(mockOpenSession).not.toHaveBeenCalled()
  })

  it('allows opening when the user has no OPEN session', async () => {
    mockFindOpenSessionByUser.mockResolvedValue(null)

    const session = await openCashSession(CTX, { cashRegisterId: REGISTER.id, openingFloat: 75 })

    expect(session.status).toBe('OPEN')
    expect(mockOpenSession).toHaveBeenCalledWith(
      expect.objectContaining({
        cashRegisterId: REGISTER.id,
        openedByUserId: CTX.userId,
        openingFloat: 75,
      }),
    )
  })

  it('ConflictError carries CASH_SESSION_OPEN for second OPEN', () => {
    const err = new ConflictError(
      'Ya tienes una sesión de caja abierta. Ciérrala antes de abrir otra.',
      'CASH_SESSION_OPEN',
    )
    expect(err).toBeInstanceOf(ConflictError)
    expect(err.code).toBe('CASH_SESSION_OPEN')
    expect(err.statusCode).toBe(409)
  })
})

describe('logout leaves OPEN cash (session revoke only)', () => {
  it('logoutWebSession source does not touch CashSession', () => {
    const here = dirname(fileURLToPath(import.meta.url))
    const src = readFileSync(join(here, '../../services/auth.service.ts'), 'utf8')
    const start = src.indexOf('export async function logoutWebSession')
    const end = src.indexOf('export async function createSession', start)
    expect(start).toBeGreaterThan(-1)
    expect(end).toBeGreaterThan(start)
    const body = src.slice(start, end)
    expect(body).not.toMatch(/cashSession/i)
    expect(body).toMatch(/blacklistJti|session\.deleteMany/)
  })
})
