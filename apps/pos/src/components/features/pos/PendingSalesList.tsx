'use client'

import { useState } from 'react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@hubilee/ui'
import { toast } from 'sonner'
import { useSales, useCancelSale } from '@/hooks/useSales'
import { SettleSaleModal, type PendingSaleSummary } from '@/components/features/pos/SettleSaleModal'
import { useStoreConfig } from '@/hooks/useStoreConfig'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { SaleStatus } from '@/types'

interface PendingSale extends PendingSaleSummary {
  createdAt: string | Date
  customer?: { name: string } | null
}

interface PendingSalesListProps {
  storeId: string | null
  /** The cashier's OPEN CashSession id — settling is disabled without one (spec "No open session available"). */
  cashSessionId: string | null
}

/**
 * Caja-management screen (spec `pos-sale-settlement` scenario "Order->checkout
 * flow (moto), seller != cashier", PR6): lists PENDING sales for the store —
 * created by a vendedor, awaiting settlement — and lets an authorized cashier
 * take payment for one via `SettleSaleModal`, or void/reject an abandoned one
 * via `useCancelSale` (FIX 5 — releases the reserved stock, backend-enforced
 * by `pos.sales:cancel`, granted to Cajero not Vendedor).
 */
export function PendingSalesList({ storeId, cashSessionId }: PendingSalesListProps) {
  const { data: storeConfig } = useStoreConfig()
  const currency = storeConfig?.currency ?? 'USD'
  const { data, isLoading } = useSales({ storeId, status: SaleStatus.PENDING, limit: 50 })
  const pendingSales = (data?.sales ?? []) as PendingSale[]
  const [selectedSale, setSelectedSale] = useState<PendingSale | null>(null)
  const cancelSaleMutation = useCancelSale()

  const handleCancel = async (sale: PendingSale) => {
    try {
      await cancelSaleMutation.mutateAsync(sale.id)
      toast.success('Pedido cancelado')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al cancelar el pedido')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pedidos pendientes</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-slate-500">Cargando pedidos…</p>
        ) : pendingSales.length === 0 ? (
          <p className="text-sm text-slate-500">No hay pedidos pendientes.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {pendingSales.map((sale) => (
              <li key={sale.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                <span className="font-medium">{sale.invoiceNumber ?? sale.id.slice(0, 8)}</span>
                <span className="text-slate-600">{formatDate(sale.createdAt)}</span>
                <span className="text-slate-600">{sale.customer?.name ?? 'Sin cliente'}</span>
                <span className="text-slate-800">{formatCurrency(sale.total, currency)}</span>
                <Badge variant="outline" className="text-xs">
                  PENDIENTE
                </Badge>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    disabled={!cashSessionId}
                    title={!cashSessionId ? 'Abre la caja antes de cobrar.' : undefined}
                    onClick={() => setSelectedSale(sale)}
                  >
                    Cobrar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={cancelSaleMutation.isPending}
                    onClick={() => handleCancel(sale)}
                  >
                    Cancelar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      {cashSessionId && (
        <SettleSaleModal
          sale={selectedSale}
          cashSessionId={cashSessionId}
          onClose={() => setSelectedSale(null)}
          onSuccess={() => setSelectedSale(null)}
        />
      )}
    </Card>
  )
}
