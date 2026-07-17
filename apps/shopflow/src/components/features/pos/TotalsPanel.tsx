'use client'

import { useStoreConfig } from '@/hooks/useStoreConfig'
import { useCartStore } from '@/store/cartStore'
import { Button } from '@multisystem/ui'
import { Card, CardContent, CardHeader, CardTitle } from '@multisystem/ui'
import { Input } from '@multisystem/ui'
import { Separator } from '@multisystem/ui'
import { formatCurrency } from '@/lib/utils/format'

interface TotalsPanelProps {
  onCheckout: () => void
  taxRate?: number
  /** Blocks checkout regardless of cart state — e.g. no OPEN cash session yet (direct POS gate). */
  disabled?: boolean
  /** Shown as the button's tooltip/help text when `disabled` is true. */
  disabledReason?: string
}

export function TotalsPanel({ onCheckout, taxRate = 0, disabled = false, disabledReason }: TotalsPanelProps) {
  const { data: storeConfig } = useStoreConfig()
  const items = useCartStore((state) => state.items)
  const discountPercent = useCartStore((state) => state.discount)
  const setGlobalDiscount = useCartStore((state) => state.setGlobalDiscount)
  const getSubtotalBeforeGlobal = useCartStore((state) => state.getSubtotalBeforeGlobal)
  const getGlobalDiscountAmount = useCartStore((state) => state.getGlobalDiscountAmount)
  const currency = storeConfig?.currency ?? 'USD'

  const subtotalBeforeGlobal = getSubtotalBeforeGlobal()
  const globalDiscountAmount = getGlobalDiscountAmount()
  const subtotal = useCartStore((state) => state.getSubtotal())
  const tax = subtotal * taxRate
  const total = subtotal + tax

  const handleDiscountChange = (value: string) => {
    const numValue = parseFloat(value) || 0
    setGlobalDiscount(Math.min(100, Math.max(0, numValue)))
  }

  const canCheckout = items.length > 0 && total > 0 && !disabled

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Totales</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="space-y-4 flex-1">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Descuento global (%)
            </label>
            <Input
              type="number"
              placeholder="0"
              value={discountPercent === 0 ? '' : String(discountPercent)}
              onChange={(e) => handleDiscountChange(e.target.value)}
              min={0}
              max={100}
              step={0.1}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span>{formatCurrency(subtotalBeforeGlobal, currency)}</span>
            </div>
            {globalDiscountAmount > 0 && (
              <div className="flex justify-between text-sm text-red-600">
                <span>Descuento ({discountPercent}%):</span>
                <span>-{formatCurrency(globalDiscountAmount, currency)}</span>
              </div>
            )}
            {taxRate > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Impuesto ({taxRate * 100}%):</span>
                <span>{formatCurrency(tax, currency)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span>{formatCurrency(total, currency)}</span>
            </div>
          </div>
        </div>

        <Button
          className="w-full mt-4"
          size="lg"
          onClick={onCheckout}
          disabled={!canCheckout}
          title={
            disabled
              ? disabledReason
              : !canCheckout && items.length > 0 && total <= 0
                ? 'El total es 0 (por ejemplo por descuento del 100%). Ajusta el carrito o el descuento para poder cobrar.'
                : items.length === 0
                  ? 'Agrega productos al carrito para cobrar.'
                  : undefined
          }
        >
          Procesar Pago
        </Button>
        {disabled && disabledReason ? (
          <p className="mt-2 text-center text-xs text-amber-800">{disabledReason}</p>
        ) : !canCheckout && items.length > 0 && total <= 0 ? (
          <p className="mt-2 text-center text-xs text-amber-800">
            El total es $0 (descuento total o carrito vacío de importe). Ajusta descuentos o agrega productos para habilitar el cobro.
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}

