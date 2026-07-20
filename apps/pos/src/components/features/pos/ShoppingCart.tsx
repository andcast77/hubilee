'use client'

import { useStoreConfig } from '@/hooks/useStoreConfig'
import { useCartStore } from '@/store/cartStore'
import { Button } from '@hubilee/ui'
import { Card, CardContent, CardHeader, CardTitle } from '@hubilee/ui'
import { Input } from '@hubilee/ui'
import { ScrollArea } from '@hubilee/ui'
import { Trash2, ShoppingCart as CartIcon } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format'

export function ShoppingCart() {
  const { data: storeConfig } = useStoreConfig()
  const items = useCartStore((state) => state.items)
  const removeItem = useCartStore((state) => state.removeItem)
  const updateQuantity = useCartStore((state) => state.updateQuantity)
  const updateDiscount = useCartStore((state) => state.updateDiscount)
  const currency = storeConfig?.currency ?? 'USD'

  const handleDiscountChange = (productId: string, value: string) => {
    const pct = parseFloat(value)
    updateDiscount(productId, isNaN(pct) ? 0 : pct)
  }

  if (items.length === 0) {
    return (
      <Card className="h-full border-2">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CartIcon className="h-5 w-5" />
            Carrito de compra
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-10 text-muted-foreground">
            El carrito está vacío
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full flex flex-col border-2">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CartIcon className="h-5 w-5" />
          Carrito de compra
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            ({items.length} {items.length === 1 ? 'producto' : 'productos'})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
        <ScrollArea className="flex-1">
          <div className="w-full">
            {/* Header */}
            <div className="grid grid-cols-[minmax(80px,auto)_1fr_minmax(60px,auto)_minmax(75px,auto)_minmax(65px,auto)_minmax(85px,auto)_40px] gap-x-2 border-b bg-muted/30 px-3 py-2.5 text-xs font-semibold text-muted-foreground">
              <div className="truncate">SKU</div>
              <div className="truncate">Producto</div>
              <div className="text-center truncate">Cant.</div>
              <div className="text-right truncate">P. unit.</div>
              <div className="text-right truncate">Desc. %</div>
              <div className="text-right truncate">Subtotal</div>
              <div></div>
            </div>
            {/* Items */}
            <div className="divide-y">
              {items.map((item) => {
                const price = Number(item.product.price)
                const itemSubtotal =
                  price * item.quantity * (1 - (item.discount || 0) / 100)
                return (
                  <div
                    key={item.product.id}
                    className="grid grid-cols-[minmax(80px,auto)_1fr_minmax(60px,auto)_minmax(75px,auto)_minmax(65px,auto)_minmax(85px,auto)_40px] gap-x-2 px-3 py-2.5 hover:bg-muted/30 transition-colors items-center"
                  >
                    <div className="min-w-0">
                      <span className="text-xs text-muted-foreground/80 tabular-nums truncate block">
                        {item.product.sku ?? '—'}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="font-medium text-sm line-clamp-2 block">{item.product.name}</span>
                    </div>
                    <div className="flex justify-center">
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          updateQuantity(
                            item.product.id,
                            parseInt(e.target.value) || 1
                          )
                        }
                        className="h-8 w-full max-w-[60px] text-center text-sm tabular-nums px-1"
                        min={1}
                      />
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-muted-foreground tabular-nums whitespace-nowrap">
                        {formatCurrency(price, currency)}
                      </span>
                    </div>
                    <div className="flex justify-end">
                      <Input
                        type="number"
                        placeholder="0"
                        value={item.discount ? String(item.discount) : ''}
                        onChange={(e) =>
                          handleDiscountChange(item.product.id, e.target.value)
                        }
                        className="h-8 w-full max-w-[65px] text-right text-sm tabular-nums px-1"
                        min={0}
                        max={100}
                        step={0.1}
                      />
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-sm tabular-nums whitespace-nowrap">
                        {formatCurrency(itemSubtotal, currency)}
                      </span>
                    </div>
                    <div className="flex justify-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => removeItem(item.product.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

