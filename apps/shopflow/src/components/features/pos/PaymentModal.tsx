'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@multisystem/ui'
import { Button } from '@multisystem/ui'
import { Input } from '@multisystem/ui'
import { Label } from '@multisystem/ui'
import { useCartStore } from '@/store/cartStore'
import { useStoreConfig } from '@/hooks/useStoreConfig'
import { useCustomerPoints, useRedeemPoints, useLoyaltyConfig } from '@/hooks/useLoyalty'
import { useUser } from '@/hooks/useUser'
import { useCreateSale } from '@/hooks/useSales'
import { useStoreContextOptional } from '@/components/providers/StoreContext'
import { formatCurrency } from '@/lib/utils/format'
import { PaymentMethod } from '@/types'
import { Badge } from '@multisystem/ui'
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
  const { data: customerPoints } = useCustomerPoints(customerId)
  const { data: loyaltyConfig } = useLoyaltyConfig()
  const redeemPointsMutation = useRedeemPoints()
  const { data: user } = useUser()
  const storeContext = useStoreContextOptional()
  const createSaleMutation = useCreateSale()

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH)
  const [paidAmount, setPaidAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [pointsToRedeem, setPointsToRedeem] = useState('')
  const [pointsDiscount, setPointsDiscount] = useState(0)

  const taxRate = storeConfig?.taxRate || 0
  const currency = storeConfig?.currency ?? 'USD'
  const subtotal = useCartStore((state) => state.getSubtotal())
  const tax = (subtotal - pointsDiscount) * taxRate
  const total = subtotal - pointsDiscount + tax
  const change = paymentMethod === 'CASH' && paidAmount
    ? parseFloat(paidAmount) - total
    : 0

  const handleRedeemPoints = async () => {
    if (!customerId || !pointsToRedeem || !loyaltyConfig) return

    const points = parseInt(pointsToRedeem)
    if (points <= 0 || points > (customerPoints?.availablePoints || 0)) {
      toast.error('Cantidad de puntos inválida')
      return
    }

    try {
      const result = await redeemPointsMutation.mutateAsync({
        customerId,
        pointsToRedeem: points,
        description: 'Canje de puntos en venta',
      })
      setPointsDiscount(result.discountAmount)
      setPointsToRedeem('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al canjear puntos')
    }
  }

  const handleRemovePointsDiscount = () => {
    setPointsDiscount(0)
    setPointsToRedeem('')
  }

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
          discount: getGlobalDiscountAmount() + pointsDiscount,
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

          {/* Customer Points Balance */}
          {customerId && customerPoints && (
            <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-900">
                  Puntos Disponibles
                </span>
                <Badge variant="secondary" className="text-lg font-bold">
                  {customerPoints.availablePoints}
                </Badge>
              </div>
              {loyaltyConfig && (
                <div className="text-xs text-blue-700 mb-2">
                  {loyaltyConfig.redemptionRate * 100}% de descuento por punto
                  {customerPoints.expiringSoon > 0 && (
                    <span className="block text-orange-600 mt-1">
                      {customerPoints.expiringSoon} puntos expiran pronto
                    </span>
                  )}
                </div>
              )}
              {pointsDiscount === 0 ? (
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Puntos a canjear"
                    value={pointsToRedeem}
                    onChange={(e) => setPointsToRedeem(e.target.value)}
                    min={1}
                    max={customerPoints.availablePoints}
                    className="flex-1 text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRedeemPoints}
                    disabled={!pointsToRedeem || parseInt(pointsToRedeem) <= 0}
                  >
                    Canjear
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-green-700">
                    Descuento aplicado: {formatCurrency(pointsDiscount, currency)}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRemovePointsDiscount}
                  >
                    Quitar
                  </Button>
                </div>
              )}
            </div>
          )}

          <div>
            <Label>Total a Pagar</Label>
            <Input
              type="text"
              value={formatCurrency(total, currency)}
              disabled
              className="mt-1 font-bold"
            />
            {pointsDiscount > 0 && (
              <p className="text-xs text-green-600 mt-1">
                Descuento por puntos: -{formatCurrency(pointsDiscount, currency)}
              </p>
            )}
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

