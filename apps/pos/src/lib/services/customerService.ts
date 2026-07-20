import { posApi, type ApiResult } from '@/lib/api/client'
import { ApiError, ErrorCodes } from '@/lib/utils/errors'
import type { CreateCustomerInput, UpdateCustomerInput, CustomerQueryInput } from '@/lib/validations/customer'

export interface CustomersResponse {
  customers: Array<any>
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export async function getCustomers(query: CustomerQueryInput = {}) {
  const { search, email, phone, page, limit, sortBy, sortOrder } = query

  // Build query parameters
  const params = new URLSearchParams()
  if (search) params.append('search', search)
  if (email) params.append('email', email)
  if (phone) params.append('phone', phone)
  if (page) params.append('page', page.toString())
  if (limit) params.append('limit', limit.toString())
  if (sortBy) params.append('sortBy', sortBy)
  if (sortOrder) params.append('sortOrder', sortOrder)

  const response = await posApi.get<ApiResult<CustomersResponse>>(
    `/customers?${params.toString()}`
  )

  if (!response.success) {
    throw new ApiError(500, response.error || 'Error al obtener clientes', ErrorCodes.INTERNAL_ERROR)
  }

  return response.data
}

export async function getCustomerById(id: string) {
  const response = await posApi.get<ApiResult<any>>(
    `/customers/${id}`
  )

  if (!response.success) {
    throw new ApiError(404, response.error || 'Customer not found', ErrorCodes.NOT_FOUND)
  }

  return response.data
}

export async function searchCustomers(searchTerm: string, limit = 10) {
  const params = new URLSearchParams({ search: searchTerm })
  const response = await posApi.get<ApiResult<CustomersResponse>>(
    `/customers?${params.toString()}`
  )

  if (!response.success) {
    throw new ApiError(500, response.error || 'Error al buscar clientes', ErrorCodes.INTERNAL_ERROR)
  }

  // Limit results on client side for autocomplete purposes.
  return response.data.customers.slice(0, limit).map((c: any) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
  }))
}

export async function createCustomer(data: CreateCustomerInput) {
  const response = await posApi.post<ApiResult<any>>(
    '/customers',
    data
  )

  if (!response.success) {
    throw new ApiError(400, response.error || 'Error al crear cliente', ErrorCodes.VALIDATION_ERROR)
  }

  return response.data
}

export async function updateCustomer(id: string, data: UpdateCustomerInput) {
  const response = await posApi.put<ApiResult<any>>(
    `/customers/${id}`,
    data
  )

  if (!response.success) {
    if (response.error?.includes('no encontrado')) {
      throw new ApiError(404, 'Customer not found', ErrorCodes.NOT_FOUND)
    }
    throw new ApiError(400, response.error || 'Error al actualizar cliente', ErrorCodes.VALIDATION_ERROR)
  }

  return response.data
}

export async function deleteCustomer(id: string) {
  const response = await posApi.delete<ApiResult<any>>(
    `/customers/${id}`
  )

  if (!response.success) {
    if (response.error?.includes('no encontrado')) {
      throw new ApiError(404, 'Customer not found', ErrorCodes.NOT_FOUND)
    }
    if (response.error?.includes('tiene ventas')) {
      throw new ApiError(
        400,
        'Cannot delete customer that has sales. Sales are preserved for historical records.',
        ErrorCodes.VALIDATION_ERROR
      )
    }
    throw new ApiError(400, response.error || 'Error al eliminar cliente', ErrorCodes.VALIDATION_ERROR)
  }

  return response.data || { success: true }
}

