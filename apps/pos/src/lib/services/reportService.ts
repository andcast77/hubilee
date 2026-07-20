import { posApi } from '@/lib/api/client'

export interface SalesStats {
  totalSales: number
  totalRevenue: number
  totalTax: number
  totalDiscount: number
  averageSale: number
  salesCount: number
}

export interface DailySalesData {
  date: string
  sales: number
  revenue: number
}

export interface ProductSalesData {
  productId: string
  productName: string
  quantity: number
  revenue: number
  salesCount: number
}

export interface PaymentMethodStats {
  paymentMethod: string
  count: number
  total: number
}

export async function getSalesStats(
  startDate?: Date,
  endDate?: Date,
  storeId?: string | null
): Promise<SalesStats> {
  const params = new URLSearchParams()
  if (startDate) params.append('startDate', startDate.toISOString())
  if (endDate) params.append('endDate', endDate.toISOString())
  if (storeId) params.append('storeId', storeId)

  const response = await posApi.get<{
    success: boolean
    data?: SalesStats
    error?: string
  }>(`/reports/stats?${params.toString()}`)

  if (!response.success || !response.data) {
    throw new Error(response.error || 'Error al obtener estadísticas')
  }

  return response.data
}

export async function getDailySales(
  days: number = 30,
  storeId?: string | null
): Promise<DailySalesData[]> {
  const params = new URLSearchParams()
  params.append('days', days.toString())
  if (storeId) params.append('storeId', storeId)

  const response = await posApi.get<{
    success: boolean
    data?: DailySalesData[]
    error?: string
  }>(`/reports/daily?${params.toString()}`)

  if (!response.success || !response.data) {
    throw new Error(response.error || 'Error al obtener ventas diarias')
  }

  return response.data
}

export async function getTopProducts(
  limit: number = 10,
  startDate?: Date,
  endDate?: Date,
  categoryId?: string,
  storeId?: string | null
): Promise<ProductSalesData[]> {
  const params = new URLSearchParams()
  params.append('limit', limit.toString())
  if (startDate) params.append('startDate', startDate.toISOString())
  if (endDate) params.append('endDate', endDate.toISOString())
  if (categoryId) params.append('categoryId', categoryId)
  if (storeId) params.append('storeId', storeId)

  const response = await posApi.get<{
    success: boolean
    data?: ProductSalesData[]
    error?: string
  }>(`/reports/top-products?${params.toString()}`)

  if (!response.success || !response.data) {
    throw new Error(response.error || 'Error al obtener productos más vendidos')
  }

  return response.data
}

export async function getPaymentMethodStats(
  startDate?: Date,
  endDate?: Date,
  storeId?: string | null
): Promise<PaymentMethodStats[]> {
  const params = new URLSearchParams()
  if (startDate) params.append('startDate', startDate.toISOString())
  if (endDate) params.append('endDate', endDate.toISOString())
  if (storeId) params.append('storeId', storeId)

  const response = await posApi.get<{
    success: boolean
    data?: PaymentMethodStats[]
    error?: string
  }>(`/reports/payment-methods?${params.toString()}`)

  if (!response.success || !response.data) {
    throw new Error(response.error || 'Error al obtener estadísticas de métodos de pago')
  }

  return response.data
}

export async function getInventoryStats(storeId?: string | null) {
  const params = new URLSearchParams()
  if (storeId) params.append('storeId', storeId)
  const response = await posApi.get<{
    success: boolean
    data?: {
      totalProducts: number
      lowStockProducts: number
      outOfStockProducts: number
      totalValue: number
      totalStockUnits: number
      totalRetailValue: number
      products: Array<{
        id: string
        name: string
        stock: number
        minStock: number | null
        price: number
        value: number
      }>
    }
    error?: string
  }>(`/reports/inventory${params.toString() ? `?${params.toString()}` : ''}`)

  if (!response.success || !response.data) {
    throw new Error(response.error || 'Error al obtener estadísticas de inventario')
  }

  return response.data
}

export async function getTodayStats(storeId?: string | null) {
  const params = new URLSearchParams()
  if (storeId) params.append('storeId', storeId)
  const response = await posApi.get<{
    success: boolean
    data?: SalesStats
    error?: string
  }>(`/reports/today${params.toString() ? `?${params.toString()}` : ''}`)

  if (!response.success || !response.data) {
    throw new Error(response.error || 'Error al obtener estadísticas del día')
  }

  return response.data
}

export async function getWeekStats(storeId?: string | null) {
  const params = new URLSearchParams()
  if (storeId) params.append('storeId', storeId)
  const response = await posApi.get<{
    success: boolean
    data?: SalesStats
    error?: string
  }>(`/reports/week${params.toString() ? `?${params.toString()}` : ''}`)

  if (!response.success || !response.data) {
    throw new Error(response.error || 'Error al obtener estadísticas de la semana')
  }

  return response.data
}

export async function getMonthStats(storeId?: string | null) {
  const params = new URLSearchParams()
  if (storeId) params.append('storeId', storeId)
  const response = await posApi.get<{
    success: boolean
    data?: SalesStats
    error?: string
  }>(`/reports/month${params.toString() ? `?${params.toString()}` : ''}`)

  if (!response.success || !response.data) {
    throw new Error(response.error || 'Error al obtener estadísticas del mes')
  }

  return response.data
}

export interface DashboardBusinessMetrics {
  grossMarginPct: number
  inventoryValue: number
  refundRate: number
  pendingInvoicesTotal: number
  oldestOverdueInvoices: Array<{
    id: string
    invoiceNumber: string | null
    total: number
    dueDate: string | null
    status: string
    customerName: string | null
  }>
}

function periodToRange(period: 'today' | 'week' | 'month'): { start: Date; end: Date } {
  const now = new Date()
  if (period === 'today') {
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setHours(23, 59, 59, 999)
    return { start, end }
  }
  if (period === 'week') {
    const dayOfWeek = now.getDay()
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
    const start = new Date(now)
    start.setDate(diff)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    end.setHours(23, 59, 59, 999)
    return { start, end }
  }
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  start.setHours(0, 0, 0, 0)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

export async function getDashboardBusinessMetrics(
  period: 'today' | 'week' | 'month',
  storeId?: string | null,
): Promise<DashboardBusinessMetrics> {
  const { start, end } = periodToRange(period)
  const params = new URLSearchParams()
  params.append('startDate', start.toISOString())
  params.append('endDate', end.toISOString())
  if (storeId) params.append('storeId', storeId)
  const response = await posApi.get<{
    success: boolean
    data?: DashboardBusinessMetrics
    error?: string
  }>(`/reports/dashboard-metrics?${params.toString()}`)

  if (!response.success || !response.data) {
    throw new Error(response.error || 'Error al obtener métricas del panel')
  }

  return response.data
}

export interface SalesByUserData {
  userId: string
  userName: string
  userEmail: string
  salesCount: number
  totalRevenue: number
  averageSale: number
}

export async function getSalesByUser(
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<SalesByUserData> {
  const params = new URLSearchParams()
  if (startDate) params.append('startDate', startDate.toISOString())
  if (endDate) params.append('endDate', endDate.toISOString())

  const response = await posApi.get<{
    success: boolean
    data?: SalesByUserData
    error?: string
  }>(`/reports/by-user/${userId}?${params.toString()}`)

  if (!response.success || !response.data) {
    throw new Error(response.error || `Error al obtener estadísticas del usuario ${userId}`)
  }

  return response.data
}
