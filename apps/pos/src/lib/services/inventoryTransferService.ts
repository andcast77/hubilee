import { posApi } from '@/lib/api/client'
import { ApiError, ErrorCodes } from '@/lib/utils/errors'
import type { TransferStatus } from '@/types'

export interface CreateTransferInput {
  fromStoreId: string
  toStoreId: string
  productId: string
  quantity: number
  notes?: string
  createdById: string
}

/**
 * Create inventory transfer between stores (via API)
 */
export async function createTransfer(data: CreateTransferInput) {
  if (data.fromStoreId === data.toStoreId) {
    throw new ApiError(400, 'Cannot transfer to the same store', ErrorCodes.VALIDATION_ERROR)
  }

  if (data.quantity <= 0) {
    throw new ApiError(400, 'Quantity must be greater than zero', ErrorCodes.VALIDATION_ERROR)
  }

  // Backend validates store ownership and available stock.
  const response = await posApi.post<{ success: boolean; data: unknown; error?: string }>(
    '/inventory-transfers',
    {
      fromStoreId: data.fromStoreId,
      toStoreId: data.toStoreId,
      productId: data.productId,
      quantity: data.quantity,
      notes: data.notes,
      createdById: data.createdById,
    }
  )

  if (!response.success) {
    throw new ApiError(400, response.error || 'Error al crear transferencia', ErrorCodes.VALIDATION_ERROR)
  }

  return response.data
}

/**
 * Complete a transfer (via API)
 */
export async function completeTransfer(transferId: string) {
  const response = await posApi.post<{ success: boolean; data: unknown; error?: string }>(
    `/inventory-transfers/${transferId}/complete`
  )

  if (!response.success) {
    if (response.error?.includes('not found')) {
      throw new ApiError(404, 'Transfer not found', ErrorCodes.NOT_FOUND)
    }
    throw new ApiError(400, response.error || 'Error al completar transferencia', ErrorCodes.VALIDATION_ERROR)
  }

  return response.data
}

/**
 * Cancel a transfer (via API)
 */
export async function cancelTransfer(transferId: string) {
  const response = await posApi.post<{ success: boolean; data: unknown; error?: string }>(
    `/inventory-transfers/${transferId}/cancel`
  )

  if (!response.success) {
    if (response.error?.includes('not found')) {
      throw new ApiError(404, 'Transfer not found', ErrorCodes.NOT_FOUND)
    }
    throw new ApiError(400, response.error || 'Error al cancelar transferencia', ErrorCodes.VALIDATION_ERROR)
  }

  return response.data
}

/**
 * Get transfers with filters (via API)
 */
export async function getTransfers(filters: {
  fromStoreId?: string
  toStoreId?: string
  productId?: string
  status?: TransferStatus
  page?: number
  limit?: number
} = {}) {
  const params = new URLSearchParams()
  if (filters.fromStoreId) params.append('fromStoreId', filters.fromStoreId)
  if (filters.toStoreId) params.append('toStoreId', filters.toStoreId)
  if (filters.productId) params.append('productId', filters.productId)
  if (filters.status) params.append('status', filters.status)
  params.append('page', String(filters.page ?? 1))
  params.append('limit', String(filters.limit ?? 20))

  const response = await posApi.get<{
    success: boolean
    data?: { transfers: unknown[]; pagination: { page: number; limit: number; total: number; totalPages: number } }
  }>(`/inventory-transfers?${params.toString()}`)

  if (!response.success || !response.data) {
    return {
      transfers: [],
      pagination: { page: filters.page ?? 1, limit: filters.limit ?? 20, total: 0, totalPages: 0 },
    }
  }

  return response.data
}
