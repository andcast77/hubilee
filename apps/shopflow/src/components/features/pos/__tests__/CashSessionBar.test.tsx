import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CashSessionBar } from '@/components/features/pos/CashSessionBar'
import { CashSessionStatus } from '@/types'

// Spec scenario "No open session available" (pos-sale-settlement, PR5): the
// direct/kiosco POS screen must gate on an OPEN CashSession for the store —
// prompt to open one when none exists, and offer to close (arqueo) when one
// is open. Hooks are mocked; the wiring to the real endpoints is covered by
// `useCashSession`'s own contract with `cashSessionService` (PR2/PR3 API).

const useOpenCashSessionMutationMock = vi.fn()
const useCreateCashRegisterMock = vi.fn()
const useCloseCashSessionMock = vi.fn()

let openSessionState: { session: any; isLoading: boolean } = { session: null, isLoading: false }
let registersState: { data: any[] } = { data: [] }
let reportState: { data: any } = { data: undefined }

vi.mock('@/hooks/useCashSession', () => ({
  useCashRegisters: () => registersState,
  useCreateCashRegister: () => useCreateCashRegisterMock(),
  useOpenCashSession: () => openSessionState,
  useOpenCashSessionMutation: () => useOpenCashSessionMutationMock(),
  useCloseCashSession: () => useCloseCashSessionMock(),
  useCashSessionReport: () => reportState,
}))

vi.mock('@/components/providers/StoreContext', () => ({
  useStoreContextOptional: () => ({ currentStoreId: 'store-1' }),
}))

vi.mock('@/hooks/useStoreConfig', () => ({
  useStoreConfig: () => ({ data: { currency: 'USD' } }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  openSessionState = { session: null, isLoading: false }
  registersState = { data: [] }
  reportState = { data: undefined }
})

describe('CashSessionBar (caja gate for the direct POS screen)', () => {
  it('prompts to open a caja when the store has no OPEN session, and opens one with the entered float', async () => {
    const createRegisterMutateAsync = vi.fn(async () => ({ id: 'register-1', storeId: 'store-1', name: 'Caja Principal', active: true }))
    useCreateCashRegisterMock.mockReturnValue({ mutateAsync: createRegisterMutateAsync, isPending: false })

    const openSessionMutateAsync = vi.fn(async () => ({ id: 'session-1', status: CashSessionStatus.OPEN, openingFloat: 500 }))
    useOpenCashSessionMutationMock.mockReturnValue({ mutateAsync: openSessionMutateAsync, isPending: false })

    render(<CashSessionBar />)

    expect(screen.getByText(/no hay una caja abierta/i)).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /abrir caja/i }))

    const floatInput = await screen.findByLabelText(/monto de apertura/i)
    fireEvent.change(floatInput, { target: { value: '500' } })

    // The trigger button sits behind the now-open dialog's `aria-hidden`
    // overlay, so only the dialog's own submit button is queryable by role.
    fireEvent.click(screen.getByRole('button', { name: /abrir caja/i }))

    await waitFor(() => {
      expect(createRegisterMutateAsync).toHaveBeenCalledWith({ storeId: 'store-1', name: 'Caja Principal' })
    })
    await waitFor(() => {
      expect(openSessionMutateAsync).toHaveBeenCalledWith({ cashRegisterId: 'register-1', openingFloat: 500 })
    })
  })

  it('shows the open caja and lets the cashier close it with an arqueo', async () => {
    openSessionState = {
      session: { id: 'session-1', status: CashSessionStatus.OPEN, openingFloat: 500 },
      isLoading: false,
    }
    reportState = { data: { expectedCash: 620, cashSalesTotal: 120, openingFloat: 500 } }

    const closeSessionMutateAsync = vi.fn(async () => ({ id: 'session-1', status: CashSessionStatus.CLOSED }))
    useCloseCashSessionMock.mockReturnValue({ mutateAsync: closeSessionMutateAsync, isPending: false })

    render(<CashSessionBar />)

    expect(screen.getByText(/caja abierta/i)).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /cerrar caja/i }))

    const countedInput = await screen.findByLabelText(/efectivo contado/i)
    fireEvent.change(countedInput, { target: { value: '600' } })

    await screen.findByText(/diferencia/i)

    fireEvent.click(screen.getByRole('button', { name: /cerrar caja/i }))

    await waitFor(() => {
      expect(closeSessionMutateAsync).toHaveBeenCalledWith({ id: 'session-1', data: { countedCash: 600 } })
    })
  })
})
