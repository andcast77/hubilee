import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { CajaManagementPage } from '@/views/CajaManagementPage'
import { CashSessionStatus } from '@/types'

// FIX 1 (pos-cash-session, CRITICAL): end-to-end proof that the caja-management screen binds
// to the OPERATOR-SELECTED register's session, not "the most-recent OPEN session store-wide".
// Two registers are OPEN at once (register-A opened first, register-B opened more recently —
// the exact scenario that corrupted arqueo before this fix); switching the RegisterSelector
// must switch which register's session gates the screen.

const useCreateCashRegisterMock = vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false }))
const useOpenCashSessionMutationMock = vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false }))
const useCloseCashSessionMock = vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false }))

const registers = [
  { id: 'register-A', storeId: 'store-1', name: 'Caja 1', active: true },
  { id: 'register-B', storeId: 'store-1', name: 'Caja 2', active: true },
]

const sessionsByRegister: Record<string, any> = {
  'register-A': { id: 'session-A', cashRegisterId: 'register-A', status: CashSessionStatus.OPEN, openingFloat: 100 },
  'register-B': { id: 'session-B', cashRegisterId: 'register-B', status: CashSessionStatus.OPEN, openingFloat: 999 },
}

vi.mock('@/hooks/useCashSession', () => ({
  useCashRegisters: () => ({ data: registers, isLoading: false }),
  useOpenCashSessionsByStore: () => ({ data: [sessionsByRegister['register-A'], sessionsByRegister['register-B']] }),
  useCreateCashRegister: () => useCreateCashRegisterMock(),
  useOpenCashSession: (_storeId: unknown, registerId: string | null) => ({
    session: registerId ? sessionsByRegister[registerId] ?? null : null,
    isLoading: false,
  }),
  useOpenCashSessionMutation: () => useOpenCashSessionMutationMock(),
  useCloseCashSession: () => useCloseCashSessionMock(),
  useCashSessionReport: () => ({ data: undefined }),
}))

vi.mock('@/hooks/useSales', () => ({
  useSales: () => ({ data: { sales: [] }, isLoading: false }),
  useSettleSale: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCancelSale: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

vi.mock('@/hooks/useStoreConfig', () => ({
  useStoreConfig: () => ({ data: { currency: 'USD' } }),
}))

vi.mock('@/components/providers/StoreContext', () => ({
  useStoreContextOptional: () => ({ currentStoreId: 'store-1' }),
  useStoreContext: () => ({ currentStoreId: 'store-1', stores: [], isLoading: false, setCurrentStoreId: vi.fn() }),
}))

vi.mock('@/components/features/pos/StoreSelector', () => ({
  StoreSelector: () => null,
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('CajaManagementPage (register-aware selection, FIX 1)', () => {
  it('gates the caja bar on the SELECTED register session, not the most-recently-opened one store-wide', () => {
    render(<CajaManagementPage />)

    const select = screen.getByRole('combobox') as HTMLSelectElement

    // Select register A (opened first, openingFloat 100) — must show A's session, not B's
    // more-recent one (openingFloat 999), which a naive "most-recent" pick would surface.
    fireEvent.change(select, { target: { value: 'register-A' } })
    expect(screen.getByText(/apertura.*100/i)).not.toBeNull()
    expect(screen.queryByText(/apertura.*999/i)).toBeNull()

    // Switching the selector to register B must switch the gated session accordingly.
    fireEvent.change(select, { target: { value: 'register-B' } })
    expect(screen.getByText(/apertura.*999/i)).not.toBeNull()
    expect(screen.queryByText(/apertura.*100/i)).toBeNull()
  })
})
