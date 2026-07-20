'use client'

import { PageFrame } from '@/views/PageFrame'
import { StoreSelector } from '@/components/features/pos/StoreSelector'
import { CashSessionBar } from '@/components/features/pos/CashSessionBar'
import { RegisterSelector } from '@/components/features/pos/RegisterSelector'
import { PendingSalesList } from '@/components/features/pos/PendingSalesList'
import { useOpenCashSession } from '@/hooks/useCashSession'
import { useSelectedRegisterId } from '@/hooks/useSelectedRegister'
import { useStoreContextOptional } from '@/components/providers/StoreContext'

/**
 * Caja-management screen (spec `pos-sale-settlement`, PR6): open/close the
 * till (arqueo, reused from PR5's `CashSessionBar`) and settle PENDING sales
 * created by vendedores at the order->checkout/vendedor screen. Requires an
 * OPEN CashSession to settle — `PendingSalesList` disables the "Cobrar"
 * action until one exists.
 *
 * FIX 1 (pos-cash-session, CRITICAL): a store can have several registers each
 * with its own OPEN session — `RegisterSelector` lets the cashier pick WHICH
 * register they're operating, and every downstream query (`CashSessionBar`,
 * `PendingSalesList`'s settle gate) binds to THAT register's session, not
 * "the store's" ambiguous most-recent one.
 */
export function CajaManagementPage() {
  const storeContext = useStoreContextOptional()
  const storeId = storeContext?.currentStoreId ?? null
  const [selectedRegisterId, setSelectedRegisterId] = useSelectedRegisterId(storeId)
  const { session: cashSession } = useOpenCashSession(storeId, selectedRegisterId)

  return (
    <PageFrame title="Caja">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Gestión de Caja</h2>
          <div className="flex items-center gap-3">
            <RegisterSelector storeId={storeId} registerId={selectedRegisterId} onChange={setSelectedRegisterId} />
            <StoreSelector />
          </div>
        </div>
        <CashSessionBar registerId={selectedRegisterId} />
        <PendingSalesList storeId={storeId} cashSessionId={cashSession?.id ?? null} />
      </div>
    </PageFrame>
  )
}
