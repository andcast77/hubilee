import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSale, settleSale } from '@/lib/services/saleService'
import { PaymentMethod } from '@/types'
import type { CreateSaleInput, SettleSaleInput } from '@/lib/validations/sale'

// FIX D (pos-cash-session round 2, scope removal): loyalty (fidelización) is OUT of the POS
// MVP by user decision. `createSale` and `settleSale` must NEVER call `awardPointsForPurchase`
// anymore — a sale awards zero loyalty points from the POS, regardless of status or customer.
// The loyalty backend/admin screens are untouched (pre-existing, other screens still use them);
// this only disconnects the POS sale flow from that feature.

const posApiPostMock = vi.fn()
const awardPointsForPurchaseMock = vi.fn(async (_customerId: string, _purchaseAmount: number, _saleId: string) => 10)

vi.mock('@/lib/api/client', () => ({
  posApi: { post: (endpoint: string, data: unknown) => posApiPostMock(endpoint, data) },
}))

vi.mock('@/lib/services/loyaltyService', () => ({
  awardPointsForPurchase: (customerId: string, purchaseAmount: number, saleId: string) =>
    awardPointsForPurchaseMock(customerId, purchaseAmount, saleId),
}))

afterEach(() => {
  vi.clearAllMocks()
})

describe('saleService loyalty removed from POS flow (FIX D)', () => {
  it('awards ZERO points when createSale returns a PENDING sale', async () => {
    posApiPostMock.mockResolvedValue({
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

  it('awards ZERO points when createSale returns a COMPLETED (direct/kiosco) sale', async () => {
    posApiPostMock.mockResolvedValue({
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

    expect(awardPointsForPurchaseMock).not.toHaveBeenCalled()
  })

  it('awards ZERO points when settleSale moves a PENDING sale to COMPLETED', async () => {
    posApiPostMock.mockResolvedValue({
      success: true,
      data: { id: 'sale-settled', customerId: 'cust-1', total: 250, status: 'COMPLETED' },
    })

    const input: SettleSaleInput = { cashSessionId: 'session-1', paymentMethod: PaymentMethod.CASH, paidAmount: 250 }
    await settleSale('sale-settled', input)

    expect(awardPointsForPurchaseMock).not.toHaveBeenCalled()
  })

  it('awards ZERO points when settleSale is called for a sale without a customer', async () => {
    posApiPostMock.mockResolvedValue({
      success: true,
      data: { id: 'sale-no-customer', customerId: null, total: 250, status: 'COMPLETED' },
    })

    const input: SettleSaleInput = { cashSessionId: 'session-1', paymentMethod: PaymentMethod.CASH, paidAmount: 250 }
    await settleSale('sale-no-customer', input)

    expect(awardPointsForPurchaseMock).not.toHaveBeenCalled()
  })
})
