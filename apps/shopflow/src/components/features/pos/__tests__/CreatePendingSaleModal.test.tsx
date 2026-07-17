import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CreatePendingSaleModal } from '@/components/features/pos/CreatePendingSaleModal'
import { useCartStore } from '@/store/cartStore'

// Spec scenario "Vendedor creates a pending sale" (pos-sale-settlement, PR6):
// the vendedor screen creates the sale WITHOUT `cashSessionId`/`paymentMethod`
// /`paidAmount` — the backend then creates it PENDING with `sellerId`
// defaulted to the creator (PR4). No payment is taken here.

const createSaleMutateAsyncMock = vi.fn()

vi.mock('@/hooks/useSales', () => ({
  useCreateSale: () => ({ mutateAsync: createSaleMutateAsyncMock, isPending: false }),
}))

vi.mock('@/hooks/useStoreConfig', () => ({
  useStoreConfig: () => ({ data: { taxRate: 0, currency: 'USD' } }),
}))

vi.mock('@/hooks/useUser', () => ({
  useUser: () => ({ data: { id: 'vendedor-1' } }),
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

describe('CreatePendingSaleModal (vendedor/order->checkout flow)', () => {
  it('creates the sale without cashSessionId/paymentMethod/paidAmount, so it lands PENDING', async () => {
    createSaleMutateAsyncMock.mockResolvedValue({ id: 'pending-sale-1' })
    const onSuccess = vi.fn()
    const onClose = vi.fn()

    render(<CreatePendingSaleModal open onClose={onClose} onSuccess={onSuccess} />)

    fireEvent.click(screen.getByRole('button', { name: /confirmar pedido/i }))

    await waitFor(() => {
      expect(createSaleMutateAsyncMock).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'vendedor-1',
          data: expect.not.objectContaining({ cashSessionId: expect.anything() }),
        }),
      )
    })
    const [call] = createSaleMutateAsyncMock.mock.calls
    const body = (call[0] as { data: Record<string, unknown> }).data
    expect(body.cashSessionId).toBeUndefined()
    expect(body.paymentMethod).toBeUndefined()
    expect(body.paidAmount).toBeUndefined()

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('pending-sale-1'))
    expect(onClose).toHaveBeenCalled()
  })

  it('surfaces a creation error without crashing (e.g. oversell rejection)', async () => {
    createSaleMutateAsyncMock.mockRejectedValue(new Error('Stock insuficiente para el producto Widget'))
    const onSuccess = vi.fn()

    render(<CreatePendingSaleModal open onClose={vi.fn()} onSuccess={onSuccess} />)

    fireEvent.click(screen.getByRole('button', { name: /confirmar pedido/i }))

    await waitFor(() => expect(createSaleMutateAsyncMock).toHaveBeenCalledTimes(1))
    expect(onSuccess).not.toHaveBeenCalled()
    expect(await screen.findByRole('button', { name: /confirmar pedido/i })).not.toBeNull()
  })
})
