import { posApi } from '@/lib/api/client'
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns'

export interface ConsolidatedSalesReport {
  period: {
    start: Date
    end: Date
  }
  stores: Array<{
    storeId: string
    storeName: string
    storeCode: string
    totalSales: number
    totalRevenue: number
    totalTax: number
    transactionCount: number
  }>
  totals: {
    totalSales: number
    totalRevenue: number
    totalTax: number
    transactionCount: number
  }
}

export interface ConsolidatedInventoryReport {
  stores: Array<{
    storeId: string
    storeName: string
    storeCode: string
    totalProducts: number
    totalStock: number
    totalValue: number
    lowStockItems: number
  }>
  totals: {
    totalProducts: number
    totalStock: number
    totalValue: number
    lowStockItems: number
  }
}

/**
 * Get consolidated sales report (via API)
 */
export async function getConsolidatedSalesReport(
  startDate?: Date,
  endDate?: Date,
  storeIds?: string[]
): Promise<ConsolidatedSalesReport> {
  const start = startDate || startOfMonth(new Date())
  const end = endDate || endOfMonth(new Date())

  const params = new URLSearchParams({
    startDate: startOfDay(start).toISOString(),
    endDate: endOfDay(end).toISOString(),
  })
  if (storeIds?.length) {
    storeIds.forEach((id) => params.append('storeId', id))
  }

  const response = await posApi.get<{
    success: boolean
    data?: {
      period: { start: string; end: string }
      stores: ConsolidatedSalesReport['stores']
      totals: ConsolidatedSalesReport['totals']
    }
  }>(`/reports/consolidated-sales?${params.toString()}`)

  if (!response.success || !response.data) {
    return {
      period: { start, end },
      stores: [],
      totals: {
        totalSales: 0,
        totalRevenue: 0,
        totalTax: 0,
        transactionCount: 0,
      },
    }
  }

  return {
    period: {
      start: new Date(response.data.period.start),
      end: new Date(response.data.period.end),
    },
    stores: response.data.stores,
    totals: response.data.totals,
  }
}

/**
 * Get consolidated inventory report (via API)
 */
export async function getConsolidatedInventoryReport(
  storeIds?: string[]
): Promise<ConsolidatedInventoryReport> {
  const params = storeIds?.length ? new URLSearchParams(storeIds.map((id) => ['storeId', id])) : new URLSearchParams()
  const response = await posApi.get<{
    success: boolean
    data?: ConsolidatedInventoryReport
  }>(`/reports/consolidated-inventory?${params.toString()}`)

  if (!response.success || !response.data) {
    return {
      stores: [],
      totals: {
        totalProducts: 0,
        totalStock: 0,
        totalValue: 0,
        lowStockItems: 0,
      },
    }
  }

  return response.data
}
