import { posApi, type ApiResult } from '@/lib/api/client'
import type { UpdateTicketConfigInput } from '@/lib/validations/ticketConfig'

export async function getTicketConfig(storeId?: string) {
  const params = storeId ? new URLSearchParams({ storeId }) : undefined
  const url = `/ticket-config${params ? `?${params.toString()}` : ''}`
  
  const response = await posApi.get<ApiResult<any>>(url)

  if (!response.success) {
    throw new Error(response.error || 'Error al obtener configuración de tickets')
  }

  return response.data
}

export async function updateTicketConfig(
  data: UpdateTicketConfigInput,
  storeId?: string
) {
  const params = storeId ? new URLSearchParams({ storeId }) : undefined
  const url = `/ticket-config${params ? `?${params.toString()}` : ''}`
  
  const response = await posApi.put<ApiResult<any>>(
    url,
    { ...data, storeId }
  )

  if (!response.success) {
    throw new Error(response.error || 'Error al actualizar configuración de tickets')
  }

  return response.data
}
