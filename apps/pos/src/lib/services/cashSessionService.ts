import { posApi, type ApiResult } from '@/lib/api/client'
import { ApiError, ErrorCodes } from '@/lib/utils/errors'
import type { CashRegister, CashSession, CashSessionReport, CashSessionStatus } from '@/types'
import type {
  CreateCashRegisterInput,
  OpenCashSessionInput,
  CloseCashSessionInput,
} from '@/lib/validations/cashSession'

export async function listCashRegisters(storeId?: string | null): Promise<CashRegister[]> {
  const params = new URLSearchParams()
  if (storeId) params.set('storeId', storeId)
  const query = params.toString()

  const response = await posApi.get<ApiResult<{ registers: CashRegister[] }>>(
    `/cash-registers${query ? `?${query}` : ''}`
  )

  if (!response.success) {
    throw new ApiError(500, response.error || 'Error al obtener las cajas', ErrorCodes.INTERNAL_ERROR)
  }

  return response.data.registers
}

export async function createCashRegister(data: CreateCashRegisterInput): Promise<CashRegister> {
  const response = await posApi.post<ApiResult<CashRegister>>('/cash-registers', data)

  if (!response.success) {
    throw new ApiError(400, response.error || 'Error al crear la caja', ErrorCodes.VALIDATION_ERROR)
  }

  return response.data
}

export async function listCashSessions(params?: {
  storeId?: string | null
  cashRegisterId?: string
  status?: CashSessionStatus
}): Promise<CashSession[]> {
  const query = new URLSearchParams()
  if (params?.storeId) query.set('storeId', params.storeId)
  if (params?.cashRegisterId) query.set('cashRegisterId', params.cashRegisterId)
  if (params?.status) query.set('status', params.status)
  const qs = query.toString()

  const response = await posApi.get<ApiResult<{ sessions: CashSession[] }>>(
    `/cash-sessions${qs ? `?${qs}` : ''}`
  )

  if (!response.success) {
    throw new ApiError(500, response.error || 'Error al obtener las sesiones de caja', ErrorCodes.INTERNAL_ERROR)
  }

  return response.data.sessions
}

export async function openCashSession(data: OpenCashSessionInput): Promise<CashSession> {
  const response = await posApi.post<ApiResult<CashSession>>('/cash-sessions/open', data)

  if (!response.success) {
    throw new ApiError(400, response.error || 'Error al abrir la caja', ErrorCodes.VALIDATION_ERROR)
  }

  return response.data
}

export async function closeCashSession(id: string, data: CloseCashSessionInput): Promise<CashSession> {
  const response = await posApi.post<ApiResult<CashSession>>(`/cash-sessions/${id}/close`, data)

  if (!response.success) {
    throw new ApiError(400, response.error || 'Error al cerrar la caja', ErrorCodes.VALIDATION_ERROR)
  }

  return response.data
}

export async function getCashSessionReport(id: string): Promise<CashSessionReport> {
  const response = await posApi.get<ApiResult<CashSessionReport>>(`/cash-sessions/${id}/report`)

  if (!response.success) {
    throw new ApiError(500, response.error || 'Error al obtener el reporte de caja', ErrorCodes.INTERNAL_ERROR)
  }

  return response.data
}
