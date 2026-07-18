import { shopflowApi, type ApiResult } from '@/lib/api/client'
import { ApiError, ErrorCodes } from '@/lib/utils/errors'
import type { CreateSaleInput, SaleQueryInput, SaleItemInput, SettleSaleInput } from '@/lib/validations/sale'
import { SaleStatus } from '@/types'

export async function getSales(query: SaleQueryInput = { page: 1, limit: 20 }) {
  const {
    storeId,
    customerId,
    userId,
    status,
    paymentMethod,
    startDate,
    endDate,
    page = 1,
    limit = 20,
  } = query

  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  })

  if (storeId) params.append('storeId', storeId)
  if (customerId) params.append('customerId', customerId)
  if (userId) params.append('userId', userId)
  if (status) params.append('status', status)
  if (paymentMethod) params.append('paymentMethod', paymentMethod)
  if (startDate) params.append('startDate', startDate)
  if (endDate) params.append('endDate', endDate)

  const response = await shopflowApi.get<ApiResult<{ sales: any[]; pagination: any }>>(
    `/sales?${params.toString()}`
  )

  if (!response.success) {
    throw new ApiError(500, response.error || 'Error al obtener ventas', ErrorCodes.INTERNAL_ERROR)
  }

  return response.data
}

export async function getSaleById(id: string) {
  const response = await shopflowApi.get<{ success: boolean; data: any; error?: string }>(
    `/sales/${id}`
  )

  if (!response.success) {
    throw new ApiError(404, response.error || 'Sale not found', ErrorCodes.NOT_FOUND)
  }

  return response.data
}

export async function createSale(userId: string, data: CreateSaleInput) {
  if (data.items.length === 0) {
    throw new ApiError(400, 'Sale must include at least one item', ErrorCodes.VALIDATION_ERROR)
  }

  for (const item of data.items as SaleItemInput[]) {
    if (item.quantity <= 0 || item.price < 0) {
      throw new ApiError(400, 'Invalid sale item values', ErrorCodes.VALIDATION_ERROR)
    }
  }

  if (data.paidAmount != null && data.paidAmount < 0) {
    throw new ApiError(400, 'Paid amount cannot be negative', ErrorCodes.VALIDATION_ERROR)
  }

  // Backend is source of truth for stock, totals, tax and customer validation.
  // `cashSessionId` present -> direct/kiosco flow, settled inline as COMPLETED.
  // Absent -> PENDING sale (moto/vendedor flow, settled later via PR4's
  // `POST /sales/:id/settle`). See design D6 / apply-progress PR4 note.
  const response = await shopflowApi.post<ApiResult<any>>(
    '/sales',
    {
      storeId: data.storeId ?? null,
      customerId: data.customerId ?? null,
      userId,
      items: data.items,
      paymentMethod: data.paymentMethod,
      paidAmount: data.paidAmount,
      discount: data.discount || 0,
      taxRate: data.taxRate,
      notes: data.notes ?? null,
      cashSessionId: data.cashSessionId ?? null,
      sellerId: data.sellerId ?? null,
    }
  )

  if (!response.success) {
    throw new ApiError(400, response.error || 'Error al crear venta', ErrorCodes.VALIDATION_ERROR)
  }

  const sale = response.data

  // FIX D (pos-cash-session round 2, scope removal): loyalty (fidelización) is OUT of the POS
  // MVP by user decision — sales created from the POS never award loyalty points. The loyalty
  // backend/admin screens are untouched; this only disconnects the POS sale flow from them.

  return sale
}

/**
 * Order->checkout/vendedor flow settlement (caja-management screen, PR6):
 * moves a PENDING sale to COMPLETED, attaching the cashier's OPEN
 * CashSession and the payment taken. Backend is source of truth for the
 * PENDING/OPEN-session/same-store validation (spec `pos-sale-settlement`).
 */
export async function settleSale(id: string, data: SettleSaleInput) {
  const response = await shopflowApi.post<ApiResult<any>>(`/sales/${id}/settle`, {
    cashSessionId: data.cashSessionId,
    paymentMethod: data.paymentMethod,
    paidAmount: data.paidAmount,
  })

  if (!response.success) {
    throw new ApiError(400, response.error || 'Error al liquidar la venta', ErrorCodes.VALIDATION_ERROR)
  }

  const sale = response.data

  // FIX D (pos-cash-session round 2, scope removal): see `createSale` above — loyalty is out
  // of the POS MVP, so settlement never awards points either.

  return sale
}

export async function cancelSale(id: string) {
  const sale = await getSaleById(id)

  if (sale.status === SaleStatus.CANCELLED) {
    throw new ApiError(400, 'Sale is already cancelled', ErrorCodes.VALIDATION_ERROR)
  }

  if (sale.status === SaleStatus.REFUNDED) {
    throw new ApiError(400, 'Cannot cancel a refunded sale', ErrorCodes.VALIDATION_ERROR)
  }

  const response = await shopflowApi.post<{ success: boolean; data: any; error?: string }>(
    `/sales/${id}/cancel`,
    {}
  )

  if (!response.success) {
    throw new ApiError(400, response.error || 'Error al cancelar venta', ErrorCodes.VALIDATION_ERROR)
  }

  return response.data
}

export async function refundSale(id: string) {
  const sale = await getSaleById(id)

  if (sale.status === SaleStatus.REFUNDED) {
    throw new ApiError(400, 'Sale is already refunded', ErrorCodes.VALIDATION_ERROR)
  }

  if (sale.status === SaleStatus.CANCELLED) {
    throw new ApiError(400, 'Cannot refund a cancelled sale', ErrorCodes.VALIDATION_ERROR)
  }

  if (sale.status !== SaleStatus.COMPLETED) {
    throw new ApiError(
      400,
      `Cannot refund a sale with status ${sale.status}. Only completed sales can be refunded.`,
      ErrorCodes.VALIDATION_ERROR
    )
  }

  const response = await shopflowApi.post<{ success: boolean; data: any; error?: string }>(
    `/sales/${id}/refund`,
    {}
  )

  if (!response.success) {
    throw new ApiError(400, response.error || 'Error al reembolsar venta', ErrorCodes.VALIDATION_ERROR)
  }

  return response.data
}
