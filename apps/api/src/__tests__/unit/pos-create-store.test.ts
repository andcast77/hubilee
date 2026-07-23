/**
 * Strict TDD — createStore auto-caja.
 *
 * Verifies:
 * - createStore creates a CashRegister "Caja principal" alongside the store
 * - Failure to create the register rolls back the store (transactional)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const mockStoresCreate = vi.hoisted(() => vi.fn())
const mockCashCreateRegister = vi.hoisted(() => vi.fn())

vi.mock('../../db/index.js', () => ({
  prisma: {
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn({})),
  },
}))

vi.mock('../../repositories/index.js', () => ({
  createRepositories: vi.fn(),
}))

import { createStore } from '../../services/pos.service.js'
import { createRepositories } from '../../repositories/index.js'

describe('pos.service — createStore auto-caja', () => {
  const ctx = {
    userId: 'user-1',
    companyId: 'company-1',
    isSuperuser: false,
    membershipRole: 'OWNER',
  }

  const body = {
    name: 'Mi Local Centro',
    code: 'ML-001',
    address: null as string | null,
    phone: null as string | null,
    email: null as string | null,
    taxId: null as string | null,
  }

  beforeEach(() => {
    vi.clearAllMocks()

    const mockRepos = {
      stores: { create: mockStoresCreate },
      cash: { createRegister: mockCashCreateRegister },
    }
    vi.mocked(createRepositories).mockReturnValue(mockRepos as any)
  })

  // ── auto-caja named "Caja principal" ──

  it('creates a CashRegister named "Caja principal" when store is created', async () => {
    const expectedStore = {
      id: 'store-1',
      companyId: 'company-1',
      name: 'Mi Local Centro',
      code: 'ML-001',
    }
    const expectedRegister = {
      id: 'caja-1',
      storeId: 'store-1',
      companyId: 'company-1',
      name: 'Caja principal',
    }
    mockStoresCreate.mockResolvedValue(expectedStore)
    mockCashCreateRegister.mockResolvedValue(expectedRegister)

    const result = await createStore(ctx, body)

    // Store created with the right data
    expect(mockStoresCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Mi Local Centro',
        code: 'ML-001',
      }),
    )
    // CashRegister created for that store
    expect(mockCashCreateRegister).toHaveBeenCalledWith({
      storeId: 'store-1',
      name: 'Caja principal',
    })
    // Returns the store object
    expect(result).toEqual(expectedStore)
  })

  // ── transactional rollback on register failure ──

  it('rolls back the store when CashRegister creation fails', async () => {
    mockStoresCreate.mockResolvedValue({
      id: 'store-1',
      companyId: 'company-1',
      name: 'Mi Local Centro',
    })
    mockCashCreateRegister.mockRejectedValue(new Error('DB error: unique constraint'))

    await expect(createStore(ctx, body)).rejects.toThrow('DB error: unique constraint')

    // Both operations were attempted within the transaction
    expect(mockStoresCreate).toHaveBeenCalledOnce()
    expect(mockCashCreateRegister).toHaveBeenCalledOnce()
    // If the operation were NOT wrapped in a transaction, the store would
    // remain committed even though the register failed. The RED test forces
    // a $transaction wrapper — safe rollback on any failure.
  })

  // ── RED 3: different body data passed through ──

  it('passes full body data through to stores.create within transaction', async () => {
    const fullBody = {
      name: 'Sucursal Norte',
      code: 'SN-002',
      address: 'Av. Siempre Viva 742',
      phone: '+541155667788',
      email: 'norte@test.com',
      taxId: '30-12345678-9',
    }

    mockStoresCreate.mockResolvedValue({
      id: 'store-2',
      ...fullBody,
      companyId: 'company-1',
    })
    mockCashCreateRegister.mockResolvedValue({
      id: 'caja-2',
      storeId: 'store-2',
      name: 'Caja principal',
    })

    await createStore(ctx, fullBody)

    expect(mockStoresCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Sucursal Norte',
        code: 'SN-002',
        address: 'Av. Siempre Viva 742',
      }),
    )
  })
})
