'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@hubilee/ui'
import { Package, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react'
import { useInventoryStats } from '@/hooks/useReports'

export function InventoryOverview() {
  const { data: inventoryStats, isLoading } = useInventoryStats()

  const totalProducts = inventoryStats?.totalProducts ?? 0
  const activeProducts = totalProducts // report counts active products only
  const totalStock = inventoryStats?.totalStockUnits ?? 0
  const totalValue = inventoryStats?.totalRetailValue ?? 0
  const lowStockProductsCount = inventoryStats?.lowStockProducts ?? 0

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount)
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{isLoading ? '—' : totalProducts}</div>
          <p className="text-xs text-muted-foreground">
            {activeProducts} activos
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Stock Total</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{isLoading ? '—' : totalStock.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            Unidades en inventario
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
          <TrendingDown className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{isLoading ? '—' : formatCurrency(totalValue)}</div>
          <p className="text-xs text-muted-foreground">
            Valor del inventario
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600">
            {isLoading ? '—' : lowStockProductsCount}
          </div>
          <p className="text-xs text-muted-foreground">
            Requieren atención
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
