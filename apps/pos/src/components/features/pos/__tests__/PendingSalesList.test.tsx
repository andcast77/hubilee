import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { PendingSalesList } from '@/components/features/pos/PendingSalesList'

// Spec scenario "Order->checkout flow (moto), seller != cashier"
// (pos-sale-settlement, PR6): the caja-management screen lists PENDING sales
// for the store and lets an authorized cashier settle one against their OPEN
// CashSession via `POST /sales/:id/settle`.

const settleSaleMutateAsyncMock = vi.fn()
const cancelSaleMutateAsyncMock = vi.fn()

let salesQueryState: { data: { sales: unknown[] } | undefined; isLoading: boolean } = {
  data: { sales: [] },
  isLoading: false,
}

vi.mock('@/hooks/useSales', () => ({
  useSales: () => salesQueryState,
  useSettleSale: () => ({ mutateAsync: settleSaleMutateAsyncMock, isPending: false }),
  useCancelSale: () => ({ mutateAsync: cancelSaleMutateAsyncMock, isPending: false }),
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
  salesQueryState = { data: { sales: [] }, isLoading: false }
})

// FIX 5 (pos-cash-session): Cajero can void an abandoned PENDING sale to release
// its reserved stock — the caja screens previously had no cancel/reject action.

describe('PendingSalesList (caja-management screen)', () => {
  it('lists PENDING sales for the store and settles one against the OPEN cash session', async () => {
    salesQueryState = {
      data: {
        sales: [
          {
            id: 'pending-sale-1',
            total: 250,
            invoiceNumber: null,
            sellerId: 'vendedor-1',
            createdAt: new Date().toISOString(),
            customer: { name: 'Cliente Moto' },
          },
        ],
      },
      isLoading: false,
    }
    settleSaleMutateAsyncMock.mockResolvedValue({ id: 'pending-sale-1', status: 'COMPLETED' })

    render(<PendingSalesList storeId="store-1" cashSessionId="session-1" />)

    expect(screen.getByText('Cliente Moto')).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /cobrar/i }))

    const paidInput = await screen.findByRole('spinbutton')
    fireEvent.change(paidInput, { target: { value: '250' } })
    fireEvent.click(screen.getByRole('button', { name: /confirmar cobro/i }))

    await waitFor(() => {
      expect(settleSaleMutateAsyncMock).toHaveBeenCalledWith({
        id: 'pending-sale-1',
        data: { cashSessionId: 'session-1', paymentMethod: 'CASH', paidAmount: 250 },
      })
    })
  })

  it('disables the "Cobrar" action when there is no OPEN cash session', () => {
    salesQueryState = {
      data: {
        sales: [
          {
            id: 'pending-sale-2',
            total: 100,
            invoiceNumber: null,
            sellerId: 'vendedor-1',
            createdAt: new Date().toISOString(),
            customer: null,
          },
        ],
      },
      isLoading: false,
    }

    render(<PendingSalesList storeId="store-1" cashSessionId={null} />)

    const cobrarButton = screen.getByRole('button', { name: /cobrar/i })
    expect(cobrarButton).toHaveProperty('disabled', true)
  })

  it('cancels a PENDING sale via the "Cancelar" action, restoring its reserved stock', async () => {
    salesQueryState = {
      data: {
        sales: [
          {
            id: 'pending-sale-3',
            total: 100,
            invoiceNumber: null,
            sellerId: 'vendedor-1',
            createdAt: new Date().toISOString(),
            customer: null,
          },
        ],
      },
      isLoading: false,
    }
    cancelSaleMutateAsyncMock.mockResolvedValue({ id: 'pending-sale-3', status: 'CANCELLED' })

    render(<PendingSalesList storeId="store-1" cashSessionId="session-1" />)

    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }))

    await waitFor(() => {
      expect(cancelSaleMutateAsyncMock).toHaveBeenCalledWith('pending-sale-3')
    })
  })
})
