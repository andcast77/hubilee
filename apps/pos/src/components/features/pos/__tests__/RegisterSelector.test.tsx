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
let userState: { data: any } = { data: { isSuperuser: true, membershipRole: 'OWNER' } }

vi.mock('@/hooks/useCashSession', () => ({
  useCashRegisters: () => registersState,
  useOpenCashSessionsByStore: () => openSessionsState,
  useCreateCashRegister: () => useCreateCashRegisterMock(),
}))

vi.mock('@/hooks/useUser', () => ({
  useUser: () => userState,
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  registersState = { data: [], isLoading: false }
  openSessionsState = { data: [] }
  userState = { data: { isSuperuser: true, membershipRole: 'OWNER' } }
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

  // FIX C (pos-cash-session round 2, WARNING): register creation is an admin/owner setup task —
  // `pos.cash-registers.create` is granted to NO role (only OWNER/ADMIN bypass it), so a
  // Cajero clicking "+ Nueva caja" would only hit a 403 dead-end.
  describe('FIX C: create-register UI is admin/owner-only', () => {
    it('hides the "+ Nueva caja" button for a non-admin role', () => {
      userState = { data: { isSuperuser: false, membershipRole: 'USER' } }
      registersState = {
        data: [{ id: 'register-A', storeId: 'store-1', name: 'Caja 1', active: true }],
        isLoading: false,
      }

      render(<RegisterSelector storeId="store-1" registerId={null} onChange={vi.fn()} />)

      expect(screen.queryByRole('button', { name: /nueva caja/i })).toBeNull()
    })

    it('shows the "+ Nueva caja" button for an OWNER', () => {
      userState = { data: { isSuperuser: false, membershipRole: 'OWNER' } }
      registersState = {
        data: [{ id: 'register-A', storeId: 'store-1', name: 'Caja 1', active: true }],
        isLoading: false,
      }

      render(<RegisterSelector storeId="store-1" registerId={null} onChange={vi.fn()} />)

      expect(screen.getByRole('button', { name: /nueva caja/i })).not.toBeNull()
    })

    it('shows the "+ Nueva caja" button for an ADMIN', () => {
      userState = { data: { isSuperuser: false, membershipRole: 'ADMIN' } }
      registersState = { data: [], isLoading: false }

      render(<RegisterSelector storeId="store-1" registerId={null} onChange={vi.fn()} />)

      expect(screen.getByRole('button', { name: /nueva caja/i })).not.toBeNull()
    })

    it('shows an empty-state message (not the create button) for a non-admin when the store has no registers', () => {
      userState = { data: { isSuperuser: false, membershipRole: 'USER' } }
      registersState = { data: [], isLoading: false }

      render(<RegisterSelector storeId="store-1" registerId={null} onChange={vi.fn()} />)

      expect(screen.queryByRole('button', { name: /nueva caja/i })).toBeNull()
      expect(screen.getByText(/pedí a un administrador que cree la caja/i)).not.toBeNull()
    })
  })
})
