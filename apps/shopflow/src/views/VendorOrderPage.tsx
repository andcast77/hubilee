'use client'

import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Badge, Button } from '@multisystem/ui'
import { PageFrame } from '@/views/PageFrame'
import { ProductPanel } from '@/components/features/pos/ProductPanel'
import { ShoppingCart } from '@/components/features/pos/ShoppingCart'
import { TotalsPanel } from '@/components/features/pos/TotalsPanel'
import { CreatePendingSaleModal } from '@/components/features/pos/CreatePendingSaleModal'
import { CustomerSelector } from '@/components/features/pos/CustomerSelector'
import { StoreSelector } from '@/components/features/pos/StoreSelector'
import { useStoreConfig } from '@/hooks/useStoreConfig'

/**
 * Vendedor screen (order->checkout/moto flow, spec `pos-sale-settlement`
 * scenario "Vendedor creates a pending sale", PR6): builds a cart and
 * creates a PENDING sale — stock is reserved at creation (design D1), but no
 * payment is taken. A cajero settles it later at the caja-management screen.
 * No OPEN CashSession is required here (unlike the direct/kiosco `/pos`
 * screen) — creating a pending order does not touch a till.
 */
export function VendorOrderPage() {
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [lastPendingSaleId, setLastPendingSaleId] = useState<string | null>(null)
  const { data: storeConfig } = useStoreConfig()

  return (
    <PageFrame title="Pedidos">
      <div className="h-[calc(100vh-12rem)] flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Nuevo Pedido</h2>
          <StoreSelector />
        </div>

        {lastPendingSaleId && (
          <div className="flex items-center justify-between gap-3 rounded-md border border-sky-300 bg-sky-50 px-3 py-2">
            <span className="text-sm text-sky-800">
              Pedido pendiente creado. Un cajero lo cobrará en la caja.
            </span>
            <Link to="/sales/$id" params={{ id: lastPendingSaleId }}>
              <Badge variant="outline" className="cursor-pointer border-sky-500 text-sky-700">
                Ver pedido
              </Badge>
            </Link>
          </div>
        )}

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-hidden">
          <div className="lg:col-span-5 overflow-hidden">
            <ProductPanel />
          </div>
          <div className="lg:col-span-7 flex flex-col gap-4 overflow-hidden">
            <CustomerSelector />
            <div className="flex-1 min-h-0">
              <ShoppingCart />
            </div>
            <TotalsPanel
              onCheckout={() => setConfirmModalOpen(true)}
              taxRate={storeConfig?.taxRate || 0}
              checkoutLabel="Crear Pedido"
            />
          </div>
        </div>
      </div>
      <CreatePendingSaleModal
        open={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onSuccess={(saleId) => {
          setLastPendingSaleId(saleId)
        }}
      />
    </PageFrame>
  )
}
