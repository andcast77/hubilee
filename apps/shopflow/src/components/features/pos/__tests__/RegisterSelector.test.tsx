import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { RegisterSelector } from '@/components/features/pos/RegisterSelector'
import { CashSessionStatus } from '@/types'

// FIX 1 (pos-cash-session, CRITICAL): lets the operator select WHICH register they're
// physically on, from a list showing each register's open/closed state — a store can have
// several registers, each with its own independent OPEN session.

const useCreateCashRegisterMock = vi.fn()

let registersState: { data: any[]; isLoading: boolean } = { data: [], isLoading: false }
let openSessionsState: { data: any[] } = { data: [] }

vi.mock('@/hooks/useCashSession', () => ({
  useCashRegisters: () => registersState,
  useOpenCashSessionsByStore: () => openSessionsState,
  useCreateCashRegister: () => useCreateCashRegisterMock(),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  registersState = { data: [], isLoading: false }
  openSessionsState = { data: [] }
})

beforeEach(() => {
  useCreateCashRegisterMock.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
})

describe('RegisterSelector', () => {
  it('lists the store registers with their open/closed state and reports the selection', () => {
    registersState = {
      data: [
        { id: 'register-A', storeId: 'store-1', name: 'Caja 1', active: true },
        { id: 'register-B', storeId: 'store-1', name: 'Caja 2', active: true },
      ],
      isLoading: false,
    }
    openSessionsState = { data: [{ id: 'session-A', cashRegisterId: 'register-A', status: CashSessionStatus.OPEN }] }

    const onChange = vi.fn()
    render(<RegisterSelector storeId="store-1" registerId={null} onChange={onChange} />)

    const select = screen.getByRole('combobox') as HTMLSelectElement
    const options = Array.from(select.querySelectorAll('option')).map((o) => o.textContent)
    expect(options.some((o) => o?.includes('Caja 1') && o?.toLowerCase().includes('abierta'))).toBe(true)
    expect(options.some((o) => o?.includes('Caja 2') && o?.toLowerCase().includes('cerrada'))).toBe(true)

    fireEvent.change(select, { target: { value: 'register-B' } })
    expect(onChange).toHaveBeenCalledWith('register-B')
  })

  it('creates a new register and selects it when none exist yet for the store', async () => {
    registersState = { data: [], isLoading: false }
    openSessionsState = { data: [] }
    const createMutateAsync = vi.fn(async () => ({ id: 'register-new', storeId: 'store-1', name: 'Caja Principal', active: true }))
    useCreateCashRegisterMock.mockReturnValue({ mutateAsync: createMutateAsync, isPending: false })

    const onChange = vi.fn()
    render(<RegisterSelector storeId="store-1" registerId={null} onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: /nueva caja/i }))
    const nameInput = await screen.findByLabelText(/nombre/i)
    fireEvent.change(nameInput, { target: { value: 'Caja Principal' } })
    fireEvent.click(screen.getByRole('button', { name: /crear/i }))

    await waitFor(() => {
      expect(createMutateAsync).toHaveBeenCalledWith({ storeId: 'store-1', name: 'Caja Principal' })
    })
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith('register-new')
    })
  })
})
