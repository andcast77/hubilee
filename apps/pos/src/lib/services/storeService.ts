import { posApi } from '@/lib/api/client'
import { ApiError, ErrorCodes } from '@/lib/utils/errors'

export interface CreateStoreInput {
  name: string
  code: string
  address?: string
  phone?: string
  email?: string
  taxId?: string
}

export interface UpdateStoreInput {
  name?: string
  code?: string
  address?: string
  phone?: string
  email?: string
  taxId?: string
  active?: boolean
}

/**
 * Get all stores (via API)
 */
export async function getStores(includeInactive = false) {
  const response = await posApi.get<{ success: boolean; data: unknown[]; error?: string }>(
    `/stores?includeInactive=${includeInactive}`
  )

  if (!response.success) {
    throw new ApiError(500, response.error || 'Error al obtener tiendas', ErrorCodes.INTERNAL_ERROR)
  }

  return response.data
}

/**
 * Get store by ID (via API)
 */
export async function getStoreById(storeId: string) {
  const response = await posApi.get<{ success: boolean; data: unknown; error?: string }>(
    `/stores/${storeId}`
  )

  if (!response.success || !response.data) {
    throw new ApiError(404, response.error || 'Store not found', ErrorCodes.NOT_FOUND)
  }

  return response.data
}

/**
 * Get store by code (via API)
 */
export async function getStoreByCode(code: string) {
  const response = await posApi.get<{ success: boolean; data: unknown; error?: string }>(
    `/stores/by-code/${encodeURIComponent(code)}`
  )

  if (!response.success || !response.data) {
    throw new ApiError(404, response.error || 'Store not found', ErrorCodes.NOT_FOUND)
  }

  return response.data
}

/**
 * Create a new store (via API)
 */
export async function createStore(data: CreateStoreInput) {
  const response = await posApi.post<{ success: boolean; data: unknown; error?: string }>(
    '/stores',
    data
  )

  if (!response.success) {
    if (response.error?.toLowerCase().includes('already exists') || response.error?.toLowerCase().includes('code')) {
      throw new ApiError(409, response.error || 'Store code already exists', ErrorCodes.CONFLICT)
    }
    throw new ApiError(400, response.error || 'Error al crear tienda', ErrorCodes.VALIDATION_ERROR)
  }

  return response.data
}

/**
 * Update store (via API)
 */
export async function updateStore(storeId: string, data: UpdateStoreInput) {
  const response = await posApi.put<{ success: boolean; data: unknown; error?: string }>(
    `/stores/${storeId}`,
    data
  )

  if (!response.success) {
    if (response.error?.toLowerCase().includes('already exists')) {
      throw new ApiError(409, response.error || 'Store code already exists', ErrorCodes.CONFLICT)
    }
    throw new ApiError(400, response.error || 'Error al actualizar tienda', ErrorCodes.VALIDATION_ERROR)
  }

  return response.data
}

/**
 * Delete store (via API, soft or hard delete)
 */
export async function deleteStore(storeId: string) {
  await getStoreById(storeId)

  const response = await posApi.delete<{ success: boolean; data: unknown; error?: string }>(
    `/stores/${storeId}`
  )

  if (!response.success) {
    throw new ApiError(500, response.error || 'Error al eliminar tienda', ErrorCodes.INTERNAL_ERROR)
  }

  return response.data
}
