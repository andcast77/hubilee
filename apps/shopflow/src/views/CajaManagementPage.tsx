'use client'

import { PageFrame } from '@/views/PageFrame'
import { StoreSelector } from '@/components/features/pos/StoreSelector'
import { CashSessionBar } from '@/components/features/pos/CashSessionBar'
import { PendingSalesList } from '@/components/features/pos/PendingSalesList'
import { useOpenCashSession } from '@/hooks/useCashSession'
import { useStoreContextOptional } from '@/components/providers/StoreContext'

/**
 * Caja-management screen (spec `pos-sale-settlement`, PR6): open/close the
 * till (arqueo, reused from PR5's `CashSessionBar`) and settle PENDING sales
 * created by vendedores at the order->checkout/vendedor screen. Requires an
 * OPEN CashSession to settle — `PendingSalesList` disables the "Cobrar"
 * action until one exists.
 */
export function CajaManagementPage() {
  const storeContext = useStoreContextOptional()
  const storeId = storeContext?.currentStoreId ?? null
  const { session: cashSession } = useOpenCashSession(storeId)

  return (
    <PageFrame title="Caja">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Gestión de Caja</h2>
          <StoreSelector />
        </div>
        <CashSessionBar />
        <PendingSalesList storeId={storeId} cashSessionId={cashSession?.id ?? null} />
      </div>
    </PageFrame>
  )
}
