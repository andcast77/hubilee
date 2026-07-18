import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSale } from '@/lib/services/saleService'
import { PaymentMethod } from '@/types'
import type { CreateSaleInput } from '@/lib/validations/sale'

// Spec scenario "Direct flow (kiosco)" (pos-sale-settlement): the direct POS
// screen creates+settles a sale in one call by passing `cashSessionId`. PR4
// made this the ONLY way `createSale` returns a COMPLETED sale — omitting it
// now creates a PENDING sale (moto/vendedor flow, PR6). This locks in that
// the kiosco frontend always forwards `cashSessionId` (and `sellerId` when
// present) through to `POST /v1/shopflow/sales`.

const shopflowApiPostMock = vi.fn(async (_endpoint: string, _data: unknown) => ({
  success: true,
  data: { id: 'sale-1', customerId: null, total: 100 },
}))

vi.mock('@/lib/api/client', () => ({
  shopflowApi: { post: (endpoint: string, data: unknown) => shopflowApiPostMock(endpoint, data) },
}))

afterEach(() => {
  vi.clearAllMocks()
})

describe('saleService.createSale (direct/kiosco flow)', () => {
  it('forwards cashSessionId so the sale settles inline against the OPEN session', async () => {
    const data: CreateSaleInput & { cashSessionId?: string | null; sellerId?: string | null } = {
      storeId: 'store-1',
      customerId: null,
      items: [{ productId: 'p1', quantity: 1, price: 100, discount: 0 }],
      paymentMethod: PaymentMethod.CASH,
      paidAmount: 100,
      discount: 0,
      taxRate: 0,
      notes: null,
      cashSessionId: 'session-1',
    }

    await createSale('user-1', data)

    expect(shopflowApiPostMock).toHaveBeenCalledWith(
      '/sales',
      expect.objectContaining({ cashSessionId: 'session-1' }),
    )
  })

  it('omits cashSessionId (sends null) when not provided, so the sale is created PENDING', async () => {
    const data: CreateSaleInput = {
      storeId: 'store-1',
      customerId: null,
      items: [{ productId: 'p1', quantity: 1, price: 100, discount: 0 }],
      paymentMethod: PaymentMethod.CASH,
      paidAmount: 100,
      discount: 0,
      taxRate: 0,
      notes: null,
    }

    await createSale('user-1', data)

    const [, body] = shopflowApiPostMock.mock.calls[0]
    expect((body as { cashSessionId?: string | null }).cashSessionId ?? null).toBeNull()
  })
})
