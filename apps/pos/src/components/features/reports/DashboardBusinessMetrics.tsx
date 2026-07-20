'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@hubilee/ui'
import { useDashboardBusinessMetrics } from '@/hooks/useReports'
import { formatCurrency } from '@/lib/utils/format'
import { Package, Percent, Receipt, RefreshCw } from 'lucide-react'

interface DashboardBusinessMetricsProps {
  period: 'today' | 'week' | 'month'
  storeId?: string | null
}

export function DashboardBusinessMetrics({ period, storeId }: DashboardBusinessMetricsProps) {
  const { data, isLoading } = useDashboardBusinessMetrics(period, storeId)

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cargando...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">---</div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!data) {
    return null
  }

  const marginPct = Math.round(data.grossMarginPct * 1000) / 10
  const refundPct = Math.round(data.refundRate * 1000) / 10

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margen bruto</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{marginPct}%</div>
            <p className="text-xs text-muted-foreground">Sobre ingresos del período (costo de productos)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor de inventario</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.inventoryValue)}</div>
            <p className="text-xs text-muted-foreground">Stock × costo (ámbito tienda)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Facturas pendientes</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.pendingInvoicesTotal)}</div>
            <p className="text-xs text-muted-foreground">Borradores, enviadas y vencidas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de devoluciones</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{refundPct}%</div>
            <p className="text-xs text-muted-foreground">Ventas refund vs completadas+refund</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cuentas por cobrar — facturas vencidas más antiguas</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm space-y-2">
            {data.oldestOverdueInvoices.length === 0 ? (
              <li className="text-muted-foreground">Sin facturas vencidas pendientes.</li>
            ) : (
              data.oldestOverdueInvoices.map((inv) => (
                <li key={inv.id} className="flex flex-wrap justify-between gap-2 border-b border-border pb-2 last:border-0">
                  <span>
                    {inv.invoiceNumber ?? inv.id.slice(0, 8)} · {inv.customerName ?? 'Cliente'}
                  </span>
                  <span className="font-medium tabular-nums">{formatCurrency(inv.total)}</span>
                </li>
              ))
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
