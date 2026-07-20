'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@hubilee/ui'
import { Button } from '@hubilee/ui'
import { useSale } from '@/hooks/useSales'
import { useStoreConfig } from '@/hooks/useStoreConfig'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { Separator } from '@hubilee/ui'
import { Printer } from 'lucide-react'

interface ReceiptModalProps {
  saleId: string | null
  open: boolean
  onClose: () => void
}

export function ReceiptModal({ saleId, open, onClose }: ReceiptModalProps) {
  const { data: sale } = useSale(saleId || '')
  const { data: storeConfig } = useStoreConfig()
  const currency = storeConfig?.currency ?? 'USD'

  const handlePrint = () => {
    window.print()
  }

  if (!sale) {
    return null
  }

  // Type assertion: getSaleById returns Sale with relations
  type SaleItemWithProduct = {
    id: string
    quantity: number
    price: number
    discount: number
    subtotal: number
    product: {
      id: string
      name: string
      sku: string
      barcode: string | null
      price: number
    }
  }
  const saleWithRelations = sale as typeof sale & {
    customer: { id: string; name: string } | null
    user: { id: string; name: string; email: string }
    items: SaleItemWithProduct[]
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Recibo de Venta</DialogTitle>
          <DialogDescription>
            {saleWithRelations.invoiceNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 print:p-8">
          {/* Store Info */}
          <div className="text-center border-b pb-4">
            <h2 className="text-2xl font-bold">POS POS</h2>
            <p className="text-sm text-gray-600">
              {formatDate(saleWithRelations.createdAt)}
            </p>
          </div>

          {/* Sale Info */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Factura:</span>
              <span className="font-semibold">{saleWithRelations.invoiceNumber}</span>
            </div>
            {saleWithRelations.customer && (
              <div className="flex justify-between">
                <span className="text-gray-600">Cliente:</span>
                <span>{saleWithRelations.customer.name}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Vendedor:</span>
              <span>{saleWithRelations.user.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Método de Pago:</span>
              <span>
                {saleWithRelations.paymentMethod === 'CASH' && 'Efectivo'}
                {saleWithRelations.paymentMethod === 'CARD' && 'Tarjeta'}
                {saleWithRelations.paymentMethod === 'TRANSFER' && 'Transferencia'}
              </span>
            </div>
          </div>

          <Separator />

          {/* Items */}
          <div className="space-y-2">
            <h3 className="font-semibold">Artículos</h3>
            {saleWithRelations.items.map((item: SaleItemWithProduct) => (
              <div key={item.id} className="flex justify-between text-sm">
                <div className="flex-1">
                  <p className="font-medium">{item.product.name}</p>
                  <p className="text-gray-600 text-xs">
                    {item.quantity} x {formatCurrency(item.price, currency)}
                    {item.discount > 0 && (
                      <span className="text-red-600 ml-2">
                        -{formatCurrency(item.discount, currency)}
                      </span>
                    )}
                  </p>
                </div>
                <span className="font-semibold">
                  {formatCurrency(item.subtotal, currency)}
                </span>
              </div>
            ))}
          </div>

          <Separator />

          {/* Totals */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCurrency(saleWithRelations.subtotal, currency)}</span>
            </div>
            {saleWithRelations.discount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Descuento:</span>
                <span>-{formatCurrency(saleWithRelations.discount, currency)}</span>
              </div>
            )}
            {saleWithRelations.tax > 0 && (
              <div className="flex justify-between">
                <span>Impuesto:</span>
                <span>{formatCurrency(saleWithRelations.tax, currency)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span>{formatCurrency(saleWithRelations.total, currency)}</span>
            </div>
            <div className="flex justify-between">
              <span>Pagado:</span>
              <span>{saleWithRelations.paidAmount !== null ? formatCurrency(saleWithRelations.paidAmount, currency) : formatCurrency(saleWithRelations.total, currency)}</span>
            </div>
            {saleWithRelations.change !== null && saleWithRelations.change > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Cambio:</span>
                <span>{formatCurrency(saleWithRelations.change, currency)}</span>
              </div>
            )}
          </div>

          {saleWithRelations.notes && (
            <>
              <Separator />
              <div>
                <p className="text-sm text-gray-600">Notas:</p>
                <p className="text-sm">{saleWithRelations.notes}</p>
              </div>
            </>
          )}

          <div className="flex gap-2 pt-4 border-t print:hidden">
            <Button
              variant="outline"
              onClick={handlePrint}
              className="flex-1"
            >
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
            <Button onClick={onClose} className="flex-1">
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
