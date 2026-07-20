'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@hubilee/ui'
import { Button } from '@hubilee/ui'
import { Input } from '@hubilee/ui'
import { Label } from '@hubilee/ui'
import { toast } from 'sonner'
import { useSettleSale } from '@/hooks/useSales'
import { useStoreConfig } from '@/hooks/useStoreConfig'
import { formatCurrency } from '@/lib/utils/format'
import { PaymentMethod } from '@/types'

export interface PendingSaleSummary {
  id: string
  total: number
  invoiceNumber: string | null
  sellerId?: string | null
}

interface SettleSaleModalProps {
  sale: PendingSaleSummary | null
  /** The cashier's OPEN CashSession id (spec `pos-sale-settlement` "Order->checkout flow (moto)"). */
  cashSessionId: string
  onClose: () => void
  onSuccess: () => void
}

/**
 * Caja-management screen settle dialog (PR6): takes payment for a PENDING
 * sale created by a vendedor and settles it via `POST /sales/:id/settle`,
 * attaching this OPEN session (`cashSessionId != sale.sellerId` — settling
 * cashier and creating vendedor stay distinct, spec scenario "seller != cashier").
 */
export function SettleSaleModal({ sale, cashSessionId, onClose, onSuccess }: SettleSaleModalProps) {
  const { data: storeConfig } = useStoreConfig()
  const currency = storeConfig?.currency ?? 'USD'
  const settleSaleMutation = useSettleSale()

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH)
  const [paidAmount, setPaidAmount] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const total = sale?.total ?? 0
  const change = paymentMethod === PaymentMethod.CASH && paidAmount ? parseFloat(paidAmount) - total : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sale) return
    setIsProcessing(true)

    try {
      await settleSaleMutation.mutateAsync({
        id: sale.id,
        data: {
          cashSessionId,
          paymentMethod,
          paidAmount: parseFloat(paidAmount) || total,
        },
      })
      setPaidAmount('')
      toast.success('Venta liquidada')
      onSuccess()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al liquidar la venta')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Dialog
      open={!!sale}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          if (isProcessing) return
          onClose()
        }
      }}
    >
      <DialogContent
        className="max-w-md"
        onPointerDownOutside={(e) => {
          if (isProcessing) e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          if (isProcessing) e.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle>Cobrar Pedido</DialogTitle>
          <DialogDescription>
            {sale ? `Pedido ${sale.invoiceNumber ?? sale.id.slice(0, 8)}` : ''}
          </DialogDescription>
        </DialogHeader>

        {sale && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Método de Pago</Label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="CASH">Efectivo</option>
                <option value="CARD">Tarjeta</option>
                <option value="TRANSFER">Transferencia</option>
              </select>
            </div>

            <div>
              <Label>Total a Cobrar</Label>
              <Input type="text" value={formatCurrency(total, currency)} disabled className="mt-1 font-bold" />
            </div>

            <div>
              <Label>Monto Recibido</Label>
              <Input
                type="number"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                min={total}
                step="0.01"
                required
                className="mt-1"
              />
              {paymentMethod === PaymentMethod.CASH && paidAmount && change >= 0 && (
                <p className="text-sm text-green-600 mt-1">Cambio: {formatCurrency(change, currency)}</p>
              )}
              {paymentMethod === PaymentMethod.CASH && paidAmount && change < 0 && (
                <p className="text-sm text-red-600 mt-1">Faltan: {formatCurrency(Math.abs(change), currency)}</p>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isProcessing || (paymentMethod === PaymentMethod.CASH && change < 0)}
                className="flex-1"
              >
                {isProcessing ? 'Liquidando...' : 'Confirmar Cobro'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
