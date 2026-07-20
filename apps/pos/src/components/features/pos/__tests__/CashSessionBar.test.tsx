import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CashSessionBar } from '@/components/features/pos/CashSessionBar'
import { CashSessionStatus } from '@/types'

// Spec scenario "No open session available" (pos-sale-settlement, PR5), register-aware as
// of FIX 1 (pos-cash-session): the direct/kiosco POS screen must gate on an OPEN CashSession
// for the operator's SELECTED register (not "the store", which is ambiguous when a store has
// several registers) — prompt to select a register when none is chosen yet, prompt to open
// one when the selected register has no OPEN session, and offer to close (arqueo) when one is
// open. Register selection itself is `RegisterSelector`'s responsibility (own test file);
// `CashSessionBar` only consumes the resolved `registerId` prop.

const useOpenCashSessionMutationMock = vi.fn()
const useCloseCashSessionMock = vi.fn()

let openSessionState: { session: any; isLoading: boolean } = { session: null, isLoading: false }
let reportState: { data: any } = { data: undefined }

vi.mock('@/hooks/useCashSession', () => ({
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
  reportState = { data: undefined }
})

describe('CashSessionBar (register-aware caja gate)', () => {
  it('prompts to select a register when none has been chosen yet', () => {
    render(<CashSessionBar registerId={null} />)

    expect(screen.getByText(/selecciona una caja/i)).not.toBeNull()
    expect(screen.queryByRole('button', { name: /abrir caja/i })).toBeNull()
  })

  it('prompts to open the SELECTED register when it has no OPEN session, and opens it with the entered float', async () => {
    const openSessionMutateAsync = vi.fn(async () => ({ id: 'session-1', status: CashSessionStatus.OPEN, openingFloat: 500 }))
    useOpenCashSessionMutationMock.mockReturnValue({ mutateAsync: openSessionMutateAsync, isPending: false })

    render(<CashSessionBar registerId="register-A" />)

    expect(screen.getByText(/no hay una caja abierta/i)).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /abrir caja/i }))

    const floatInput = await screen.findByLabelText(/monto de apertura/i)
    fireEvent.change(floatInput, { target: { value: '500' } })

    // The trigger button sits behind the now-open dialog's `aria-hidden`
    // overlay, so only the dialog's own submit button is queryable by role.
    fireEvent.click(screen.getByRole('button', { name: /abrir caja/i }))

    await waitFor(() => {
      expect(openSessionMutateAsync).toHaveBeenCalledWith({ cashRegisterId: 'register-A', openingFloat: 500 })
    })
  })

  it('shows the open caja for the selected register and lets the cashier close it with an arqueo', async () => {
    openSessionState = {
      session: { id: 'session-1', cashRegisterId: 'register-A', status: CashSessionStatus.OPEN, openingFloat: 500 },
      isLoading: false,
    }
    reportState = { data: { expectedCash: 620, cashSalesTotal: 120, openingFloat: 500 } }

    const closeSessionMutateAsync = vi.fn(async () => ({ id: 'session-1', status: CashSessionStatus.CLOSED }))
    useCloseCashSessionMock.mockReturnValue({ mutateAsync: closeSessionMutateAsync, isPending: false })

    render(<CashSessionBar registerId="register-A" />)

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
