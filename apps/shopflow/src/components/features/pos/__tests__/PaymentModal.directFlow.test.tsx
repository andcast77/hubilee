import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { PaymentModal } from '@/components/features/pos/PaymentModal'
import { useCartStore } from '@/store/cartStore'
import { PaymentMethod } from '@/types'

// Spec scenario "Direct flow (kiosco)" (pos-sale-settlement): checking out
// from the direct POS screen must create+settle the sale in one call by
// passing the OPEN session's `cashSessionId` — this is what makes PR4's
// `createSale` return a COMPLETED sale instead of a PENDING one. Also covers
// "Attempt to sell more than available" — the modal must surface the
// backend's oversell rejection without crashing.

const createSaleMutateAsyncMock = vi.fn()

vi.mock('@/hooks/useSales', () => ({
  useCreateSale: () => ({ mutateAsync: createSaleMutateAsyncMock, isPending: false }),
}))

vi.mock('@/hooks/useStoreConfig', () => ({
  useStoreConfig: () => ({ data: { taxRate: 0, currency: 'USD' } }),
}))

vi.mock('@/hooks/useUser', () => ({
  useUser: () => ({ data: { id: 'user-1' } }),
}))

vi.mock('@/components/providers/StoreContext', () => ({
  useStoreContextOptional: () => ({ currentStoreId: 'store-1' }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

beforeEach(() => {
  useCartStore.setState({
    items: [{ product: { id: 'p1', name: 'Widget', price: 100, stock: 5, sku: 'W1' }, quantity: 1, discount: 0 }],
    customerId: null,
    discount: 0,
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('PaymentModal (direct/kiosco flow, cashSessionId)', () => {
  it('creates the sale passing the open cashSessionId so it settles as COMPLETED', async () => {
    createSaleMutateAsyncMock.mockResolvedValue({ id: 'sale-1' })
    const onSuccess = vi.fn()

    render(<PaymentModal open cashSessionId="session-1" onClose={vi.fn()} onSuccess={onSuccess} />)

    // "Monto Recibido" is the only number input visible in this state (no
    // customer selected -> no loyalty-points redemption input rendered).
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '100' } })
    fireEvent.click(screen.getByRole('button', { name: /confirmar pago/i }))

    await waitFor(() => {
      expect(createSaleMutateAsyncMock).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          data: expect.objectContaining({ cashSessionId: 'session-1' }),
        }),
      )
    })
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('sale-1'))
  })

  it('surfaces the oversell rejection from the API without crashing', async () => {
    createSaleMutateAsyncMock.mockRejectedValue(
      new Error('Stock insuficiente para el producto Widget. Disponible: 0, Solicitado: 1'),
    )
    const onSuccess = vi.fn()

    render(<PaymentModal open cashSessionId="session-1" onClose={vi.fn()} onSuccess={onSuccess} />)

    // "Monto Recibido" is the only number input visible in this state (no
    // customer selected -> no loyalty-points redemption input rendered).
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '100' } })
    fireEvent.click(screen.getByRole('button', { name: /confirmar pago/i }))

    await waitFor(() => expect(createSaleMutateAsyncMock).toHaveBeenCalledTimes(1))
    expect(onSuccess).not.toHaveBeenCalled()
    // Still mounted / did not throw past the toast — the "Confirmar Pago" CTA is back.
    expect(await screen.findByRole('button', { name: /confirmar pago/i })).not.toBeNull()
  })

  // pos-cash-session Round 3, FIX 1: loyalty redemption was removed from the POS. A customer
  // selected in the cart must NOT surface a points-redemption UI, and the sale's `discount`
  // must be exactly the cart's global discount — no `pointsDiscount` folded in.
  it('renders no points-redemption UI and sends only the global discount, even with a customer selected', async () => {
    useCartStore.setState({
      items: [{ product: { id: 'p1', name: 'Widget', price: 100, stock: 5, sku: 'W1' }, quantity: 1, discount: 0 }],
      customerId: 'customer-1',
      discount: 0,
    })
    createSaleMutateAsyncMock.mockResolvedValue({ id: 'sale-1' })
    const onSuccess = vi.fn()

    render(<PaymentModal open cashSessionId="session-1" onClose={vi.fn()} onSuccess={onSuccess} />)

    expect(screen.queryByText(/puntos disponibles/i)).toBeNull()
    expect(screen.queryByText(/canjear/i)).toBeNull()
    expect(screen.queryByPlaceholderText(/puntos a canjear/i)).toBeNull()

    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '100' } })
    fireEvent.click(screen.getByRole('button', { name: /confirmar pago/i }))

    await waitFor(() => {
      expect(createSaleMutateAsyncMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ discount: 0, customerId: 'customer-1' }),
        }),
      )
    })
  })
})
