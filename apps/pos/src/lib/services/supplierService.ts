import { posApi, type ApiResult } from '@/lib/api/client'
import { ApiError, ErrorCodes } from '@/lib/utils/errors'
import type { CreateSupplierInput, UpdateSupplierInput, SupplierQueryInput } from '@/lib/validations/supplier'

export interface SuppliersResponse {
  suppliers: Array<any>
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export async function getSuppliers(query: SupplierQueryInput = {}) {
  const { search, active, page, limit, sortBy, sortOrder } = query

  const params = new URLSearchParams()
  if (search) params.append('search', search)
  if (active !== undefined) params.append('active', active.toString())
  if (page) params.append('page', page.toString())
  if (limit) params.append('limit', limit.toString())
  if (sortBy) params.append('sortBy', sortBy)
  if (sortOrder) params.append('sortOrder', sortOrder)

  const response = await posApi.get<ApiResult<SuppliersResponse>>(
    `/suppliers?${params.toString()}`
  )

  if (!response.success) {
    throw new ApiError(500, response.error || 'Error al obtener proveedores', ErrorCodes.INTERNAL_ERROR)
  }

  return response.data
}

export async function getSupplierById(id: string) {
  const response = await posApi.get<ApiResult<any>>(
    `/suppliers/${id}`
  )

  if (!response.success) {
    throw new ApiError(404, response.error || 'Supplier not found', ErrorCodes.NOT_FOUND)
  }

  return response.data
}

export async function createSupplier(data: CreateSupplierInput) {
  const response = await posApi.post<ApiResult<any>>(
    '/suppliers',
    data
  )

  if (!response.success) {
    throw new ApiError(400, response.error || 'Error al crear proveedor', ErrorCodes.VALIDATION_ERROR)
  }

  return response.data
}

export async function updateSupplier(id: string, data: UpdateSupplierInput) {
  const response = await posApi.put<ApiResult<any>>(
    `/suppliers/${id}`,
    data
  )

  if (!response.success) {
    if (response.error?.includes('no encontrado')) {
      throw new ApiError(404, 'Supplier not found', ErrorCodes.NOT_FOUND)
    }
    throw new ApiError(400, response.error || 'Error al actualizar proveedor', ErrorCodes.VALIDATION_ERROR)
  }

  return response.data
}

export async function deleteSupplier(id: string) {
  const response = await posApi.delete<ApiResult<any>>(
    `/suppliers/${id}`
  )

  if (!response.success) {
    if (response.error?.includes('no encontrado')) {
      throw new ApiError(404, 'Supplier not found', ErrorCodes.NOT_FOUND)
    }
    if (response.error?.includes('tiene productos')) {
      throw new ApiError(400, response.error, ErrorCodes.VALIDATION_ERROR)
    }
    throw new ApiError(400, response.error || 'Error al eliminar proveedor', ErrorCodes.VALIDATION_ERROR)
  }

  return response.data || { success: true }
}
