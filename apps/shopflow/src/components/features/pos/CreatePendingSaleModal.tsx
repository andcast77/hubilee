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
import { toast } from 'sonner'

interface CreatePendingSaleModalProps {
  open: boolean
  onClose: () => void
  onSuccess: (saleId: string) => void
}

/**
 * Vendedor screen confirm dialog (spec `pos-sale-settlement` scenario
 * "Vendedor creates a pending sale"): creates the sale WITHOUT `cashSessionId`
 * so it lands as PENDING (`sellerId` defaults to the creator per PR4). No
 * payment is taken here — that happens later at the caja-management screen
 * via `POST /sales/:id/settle` (PR6).
 */
export function CreatePendingSaleModal({ open, onClose, onSuccess }: CreatePendingSaleModalProps) {
  const items = useCartStore((state) => state.items)
  const customerId = useCartStore((state) => state.customerId)
  const clearCart = useCartStore((state) => state.clearCart)
  const getItemDiscountAmount = useCartStore((state) => state.getItemDiscountAmount)
  const getGlobalDiscountAmount = useCartStore((state) => state.getGlobalDiscountAmount)
  const { data: storeConfig } = useStoreConfig()
  const { data: user } = useUser()
  const storeContext = useStoreContextOptional()
  const createSaleMutation = useCreateSale()

  const [notes, setNotes] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const taxRate = storeConfig?.taxRate || 0
  const currency = storeConfig?.currency ?? 'USD'
  const subtotal = useCartStore((state) => state.getSubtotal())
  const total = subtotal * (1 + taxRate)

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
          discount: getGlobalDiscountAmount(),
          taxRate,
          notes: notes || null,
          // No `cashSessionId`/`paymentMethod`/`paidAmount`: the sale is
          // created PENDING, no payment taken yet (moto/vendedor flow).
        },
      })
      clearCart()
      setNotes('')
      onSuccess(sale.id)
      onClose()
    } catch (error) {
      console.error('Pending sale creation error:', error)
      toast.error(error instanceof Error ? error.message : 'Error al crear el pedido')
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
          <DialogTitle>Confirmar Pedido</DialogTitle>
          <DialogDescription>
            Se creará un pedido pendiente. El pago se cobrará luego en la caja.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Total del Pedido</Label>
            <Input type="text" value={formatCurrency(total, currency)} disabled className="mt-1 font-bold" />
          </div>

          <div>
            <Label>Notas (Opcional)</Label>
            <Input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1" />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={isProcessing} className="flex-1">
              {isProcessing ? 'Creando...' : 'Confirmar Pedido'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
