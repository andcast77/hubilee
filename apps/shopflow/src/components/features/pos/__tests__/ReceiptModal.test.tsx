import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { ReceiptModal } from '@/components/features/pos/ReceiptModal'

// pos-cash-session Round 3, FIX 1: loyalty points are never awarded from the POS anymore
// (removed in Round 2). The receipt must NOT print a "Puntos ganados" claim — that line
// used to compute a client-side estimate that no longer matches what the backend does.

const saleFixture = {
  id: 'sale-1',
  invoiceNumber: 'INV-000001',
  createdAt: new Date('2026-01-01T00:00:00Z').toISOString(),
  customerId: 'customer-1',
  customer: { id: 'customer-1', name: 'Jane Doe' },
  user: { id: 'user-1', name: 'Cashier One', email: 'cashier@example.com' },
  paymentMethod: 'CASH',
  subtotal: 100,
  discount: 0,
  tax: 0,
  total: 100,
  paidAmount: 100,
  change: 0,
  notes: null,
  items: [
    {
      id: 'item-1',
      quantity: 1,
      price: 100,
      discount: 0,
      subtotal: 100,
      product: { id: 'p1', name: 'Widget', sku: 'W1', barcode: null, price: 100 },
    },
  ],
}

const useSaleMock = vi.fn()

vi.mock('@/hooks/useSales', () => ({
  useSale: (id: string) => useSaleMock(id),
}))

vi.mock('@/hooks/useStoreConfig', () => ({
  useStoreConfig: () => ({ data: { taxRate: 0, currency: 'USD' } }),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('ReceiptModal', () => {
  it('renders no loyalty points line, even for a sale with a customer', () => {
    useSaleMock.mockReturnValue({ data: saleFixture })

    render(<ReceiptModal saleId="sale-1" open onClose={vi.fn()} />)

    expect(screen.getByText('Jane Doe')).not.toBeNull()
    expect(screen.queryByText(/puntos de lealtad/i)).toBeNull()
    expect(screen.queryByText(/puntos ganados/i)).toBeNull()
    expect(screen.queryByText(/total de puntos disponibles/i)).toBeNull()
  })
})
