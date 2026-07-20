import { useQuery } from '@tanstack/react-query'
import type {
  SalesStats,
  DailySalesData,
  ProductSalesData,
  PaymentMethodStats,
  SalesByUserData,
} from '@/lib/services/reportService'
import {
  getTodayStats,
  getWeekStats,
  getMonthStats,
  getDailySales,
  getTopProducts,
  getPaymentMethodStats,
  getInventoryStats,
  getSalesByUser,
  getDashboardBusinessMetrics,
} from '@/lib/services/reportService'

async function fetchSalesStats(
  period: 'today' | 'week' | 'month',
  storeId?: string | null
): Promise<SalesStats> {
  switch (period) {
    case 'today':
      return getTodayStats(storeId)
    case 'week':
      return getWeekStats(storeId)
    case 'month':
      return getMonthStats(storeId)
    default:
      return getTodayStats(storeId)
  }
}

async function fetchDailySales(days: number = 30, storeId?: string | null): Promise<DailySalesData[]> {
  return getDailySales(days, storeId)
}

async function fetchTopProducts(
  limit: number = 10,
  startDate?: string,
  endDate?: string,
  categoryId?: string,
  storeId?: string | null
): Promise<ProductSalesData[]> {
  return getTopProducts(
    limit,
    startDate ? new Date(startDate) : undefined,
    endDate ? new Date(endDate) : undefined,
    categoryId,
    storeId
  )
}

async function fetchPaymentMethodStats(
  startDate?: string,
  endDate?: string,
  storeId?: string | null
): Promise<PaymentMethodStats[]> {
  return getPaymentMethodStats(
    startDate ? new Date(startDate) : undefined,
    endDate ? new Date(endDate) : undefined,
    storeId
  )
}

async function fetchInventoryStats(storeId?: string | null): Promise<{
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
    minStock: number
    price: number
    value: number
  }>
}> {
  const data = await getInventoryStats(storeId)
  return {
    ...data,
    products: data.products.map((p) => ({
      ...p,
      minStock: p.minStock ?? 0,
    })),
  }
}

export function useSalesStats(period: 'today' | 'week' | 'month' = 'today', storeId?: string | null) {
  return useQuery({
    queryKey: ['reports', 'stats', period, storeId],
    queryFn: () => fetchSalesStats(period, storeId),
  })
}

export function useDashboardBusinessMetrics(period: 'today' | 'week' | 'month', storeId?: string | null) {
  return useQuery({
    queryKey: ['reports', 'dashboard-metrics', period, storeId],
    queryFn: () => getDashboardBusinessMetrics(period, storeId),
  })
}

export function useDailySales(days: number = 30, storeId?: string | null) {
  return useQuery({
    queryKey: ['reports', 'daily-sales', days, storeId],
    queryFn: () => fetchDailySales(days, storeId),
  })
}

export function useTopProducts(
  limit: number = 10,
  startDate?: string,
  endDate?: string,
  categoryId?: string,
  storeId?: string | null
) {
  return useQuery({
    queryKey: ['reports', 'top-products', limit, startDate, endDate, categoryId, storeId],
    queryFn: () => fetchTopProducts(limit, startDate, endDate, categoryId, storeId),
  })
}

export function usePaymentMethodStats(
  startDate?: string,
  endDate?: string,
  storeId?: string | null
) {
  return useQuery({
    queryKey: ['reports', 'payment-methods', startDate, endDate, storeId],
    queryFn: () => fetchPaymentMethodStats(startDate, endDate, storeId),
  })
}

export function useInventoryStats(storeId?: string | null) {
  return useQuery({
    queryKey: ['reports', 'inventory', storeId],
    queryFn: () => fetchInventoryStats(storeId),
  })
}

async function fetchSalesByUser(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<SalesByUserData> {
  return getSalesByUser(
    userId,
    startDate ? new Date(startDate) : undefined,
    endDate ? new Date(endDate) : undefined
  )
}

export function useSalesByUser(
  userId: string,
  startDate?: string,
  endDate?: string
) {
  return useQuery({
    queryKey: ['reports', 'sales-by-user', userId, startDate, endDate],
    queryFn: () => fetchSalesByUser(userId, startDate, endDate),
    enabled: !!userId,
  })
}
