import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSale, settleSale } from '@/lib/services/saleService'
import { PaymentMethod } from '@/types'
import type { CreateSaleInput, SettleSaleInput } from '@/lib/validations/sale'

// FIX 3 (pos-cash-session): loyalty points must only be awarded on COMPLETED
// sales. createSale can now return PENDING (moto/vendedor flow, PR4) — awarding
// points unconditionally on create would grant points for unpaid orders that
// are never reversed. Points must be awarded exactly once: at create-time for
// the direct/kiosco flow (COMPLETED immediately), or at settle-time for the
// order->checkout flow (PENDING -> COMPLETED) — never both, never on PENDING.

const shopflowApiPostMock = vi.fn()
const awardPointsForPurchaseMock = vi.fn(async (_customerId: string, _purchaseAmount: number, _saleId: string) => 10)

vi.mock('@/lib/api/client', () => ({
  shopflowApi: { post: (endpoint: string, data: unknown) => shopflowApiPostMock(endpoint, data) },
}))

vi.mock('@/lib/services/loyaltyService', () => ({
  awardPointsForPurchase: (customerId: string, purchaseAmount: number, saleId: string) =>
    awardPointsForPurchaseMock(customerId, purchaseAmount, saleId),
}))

afterEach(() => {
  vi.clearAllMocks()
})

describe('saleService loyalty gating (award only on COMPLETED)', () => {
  it('awards ZERO points when createSale returns a PENDING sale', async () => {
    shopflowApiPostMock.mockResolvedValue({
      success: true,
      data: { id: 'sale-pending', customerId: 'cust-1', total: 100, status: 'PENDING' },
    })

    const data: CreateSaleInput = {
      storeId: 'store-1',
      customerId: 'cust-1',
      items: [{ productId: 'p1', quantity: 1, price: 100, discount: 0 }],
      discount: 0,
      taxRate: 0,
      notes: null,
    }

    await createSale('user-1', data)

    expect(awardPointsForPurchaseMock).not.toHaveBeenCalled()
  })

  it('awards points once when createSale returns a COMPLETED (direct/kiosco) sale', async () => {
    shopflowApiPostMock.mockResolvedValue({
      success: true,
      data: { id: 'sale-direct', customerId: 'cust-1', total: 100, status: 'COMPLETED' },
    })

    const data: CreateSaleInput = {
      storeId: 'store-1',
      customerId: 'cust-1',
      items: [{ productId: 'p1', quantity: 1, price: 100, discount: 0 }],
      paymentMethod: PaymentMethod.CASH,
      paidAmount: 100,
      discount: 0,
      taxRate: 0,
      notes: null,
      cashSessionId: 'session-1',
    }

    await createSale('user-1', data)

    expect(awardPointsForPurchaseMock).toHaveBeenCalledTimes(1)
    expect(awardPointsForPurchaseMock).toHaveBeenCalledWith('cust-1', 100, 'sale-direct')
  })

  it('awards points once when settleSale moves a PENDING sale to COMPLETED', async () => {
    shopflowApiPostMock.mockResolvedValue({
      success: true,
      data: { id: 'sale-settled', customerId: 'cust-1', total: 250, status: 'COMPLETED' },
    })

    const input: SettleSaleInput = { cashSessionId: 'session-1', paymentMethod: PaymentMethod.CASH, paidAmount: 250 }
    await settleSale('sale-settled', input)

    expect(awardPointsForPurchaseMock).toHaveBeenCalledTimes(1)
    expect(awardPointsForPurchaseMock).toHaveBeenCalledWith('cust-1', 250, 'sale-settled')
  })

  it('does not award points when settleSale is called for a sale without a customer', async () => {
    shopflowApiPostMock.mockResolvedValue({
      success: true,
      data: { id: 'sale-no-customer', customerId: null, total: 250, status: 'COMPLETED' },
    })

    const input: SettleSaleInput = { cashSessionId: 'session-1', paymentMethod: PaymentMethod.CASH, paidAmount: 250 }
    await settleSale('sale-no-customer', input)

    expect(awardPointsForPurchaseMock).not.toHaveBeenCalled()
  })
})
