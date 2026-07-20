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
import { useCartStore } from '@/store/cartStore'
import { useStoreConfig } from '@/hooks/useStoreConfig'
import { useUser } from '@/hooks/useUser'
import { useCreateSale } from '@/hooks/useSales'
import { useStoreContextOptional } from '@/components/providers/StoreContext'
import { formatCurrency } from '@/lib/utils/format'
import { PaymentMethod } from '@/types'
import { toast } from 'sonner'

interface PaymentModalProps {
  open: boolean
  onClose: () => void
  onSuccess: (saleId: string) => void
  /**
   * The store's OPEN CashSession id (direct/kiosco flow, spec
   * `pos-sale-settlement` scenario "Direct flow"). When present, the sale is
   * created+settled in this single call (status COMPLETED). The POS screen
   * only renders this modal once a session is open, so this is required here.
   */
  cashSessionId: string
}

export function PaymentModal({ open, onClose, onSuccess, cashSessionId }: PaymentModalProps) {
  const items = useCartStore((state) => state.items)
  const customerId = useCartStore((state) => state.customerId)
  const clearCart = useCartStore((state) => state.clearCart)
  const getItemDiscountAmount = useCartStore((state) => state.getItemDiscountAmount)
  const getGlobalDiscountAmount = useCartStore((state) => state.getGlobalDiscountAmount)
  const { data: storeConfig } = useStoreConfig()
  const { data: user } = useUser()
  const storeContext = useStoreContextOptional()
  const createSaleMutation = useCreateSale()

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH)
  const [paidAmount, setPaidAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const taxRate = storeConfig?.taxRate || 0
  const currency = storeConfig?.currency ?? 'USD'
  const subtotal = useCartStore((state) => state.getSubtotal())
  const tax = subtotal * taxRate
  const total = subtotal + tax
  const change = paymentMethod === 'CASH' && paidAmount
    ? parseFloat(paidAmount) - total
    : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) {
      toast.error('Usuario no cargado. Intenta de nuevo.')
      return
    }
    setIsProcessing(true)

    try {
      const sale = await createSaleMutation.mutateAsync({
        userId: user.id,
        data: {
          storeId: storeContext?.currentStoreId ?? null,
          customerId: customerId || null,
          items: items.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
            price: item.product.price,
            discount: getItemDiscountAmount(item),
          })),
          paymentMethod,
          paidAmount: parseFloat(paidAmount) || total,
          discount: getGlobalDiscountAmount(),
          taxRate,
          notes: notes || null,
          // Direct/kiosco flow: settles inline against this OPEN session.
          cashSessionId,
        },
      })
      clearCart()
      onSuccess(sale.id)
      onClose()
    } catch (error) {
      console.error('Payment error:', error)
      toast.error(error instanceof Error ? error.message : 'Error al procesar el pago')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Dialog
      open={open}
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
          <DialogTitle>Procesar Pago</DialogTitle>
          <DialogDescription>
            Complete los detalles del pago
          </DialogDescription>
        </DialogHeader>

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
            <Label>Total a Pagar</Label>
            <Input
              type="text"
              value={formatCurrency(total, currency)}
              disabled
              className="mt-1 font-bold"
            />
          </div>

          {paymentMethod === 'CASH' && (
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
              {change >= 0 && (
                <p className="text-sm text-green-600 mt-1">
                  Cambio: {formatCurrency(change, currency)}
                </p>
              )}
              {change < 0 && (
                <p className="text-sm text-red-600 mt-1">
                  Faltan: {formatCurrency(Math.abs(change), currency)}
                </p>
              )}
            </div>
          )}

          {paymentMethod !== 'CASH' && (
            <div>
              <Label>Monto Pagado</Label>
              <Input
                type="number"
                value={paidAmount || total}
                onChange={(e) => setPaidAmount(e.target.value)}
                min={total}
                step="0.01"
                required
                className="mt-1"
              />
            </div>
          )}

          <div>
            <Label>Notas (Opcional)</Label>
            <Input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isProcessing || (paymentMethod === 'CASH' && change < 0)}
              className="flex-1"
            >
              {isProcessing ? 'Procesando...' : 'Confirmar Pago'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

