import { posApi, type ApiResult } from '@/lib/api/client'
import type { UpdateStoreConfigInput } from '@/lib/validations/storeConfig'

export async function getStoreConfig() {
  const response = await posApi.get<ApiResult<any>>('/store-config')

  if (!response.success) {
    throw new Error(response.error || 'Error al obtener configuración de tienda')
  }

  return response.data
}

export async function updateStoreConfig(data: UpdateStoreConfigInput) {
  const response = await posApi.put<ApiResult<any>>(
    '/store-config',
    data
  )

  if (!response.success) {
    throw new Error(response.error || 'Error al actualizar configuración de tienda')
  }

  return response.data
}

export async function getNextInvoiceNumber(): Promise<string> {
  const response = await posApi.post<ApiResult<{ invoiceNumber: string }>>(
    '/store-config/next-invoice-number',
    {}
  )

  if (!response.success) {
    throw new Error(response.error || 'Error al obtener siguiente número de factura')
  }

  return response.data.invoiceNumber
}
