'use client'

import { useState } from 'react'
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@multisystem/ui'
import { toast } from 'sonner'
import { useStoreContextOptional } from '@/components/providers/StoreContext'
import { useStoreConfig } from '@/hooks/useStoreConfig'
import {
  useOpenCashSession,
  useOpenCashSessionMutation,
  useCloseCashSession,
  useCashSessionReport,
} from '@/hooks/useCashSession'
import { formatCurrency } from '@/lib/utils/format'

interface CashSessionBarProps {
  /** The operator's SELECTED register (FIX 1 — `RegisterSelector` owns selection + persistence). */
  registerId: string | null
}

/**
 * Caja gate for the direct/kiosco POS screen (spec `pos-sale-settlement`
 * scenario "No open session available"): blocks the checkout flow behind an
 * OPEN CashSession for the operator's SELECTED register (FIX 1 — a store can
 * have multiple registers, each with its own OPEN session; binding to "the
 * store" instead of a specific register corrupted arqueo), and offers to
 * close it (arqueo) from the same bar. Exposes `session` via
 * `useOpenCashSession` so the POS screen itself can gate
 * `TotalsPanel`/`PaymentModal` on the same query.
 */
export function CashSessionBar({ registerId }: CashSessionBarProps) {
  const storeContext = useStoreContextOptional()
  const storeId = storeContext?.currentStoreId ?? null
  const { data: storeConfig } = useStoreConfig()
  const currency = storeConfig?.currency ?? 'USD'

  const { session, isLoading: sessionLoading } = useOpenCashSession(storeId, registerId)
  const openSessionMutation = useOpenCashSessionMutation()
  const closeSessionMutation = useCloseCashSession()
  const { data: report } = useCashSessionReport(session?.id ?? null)

  const [openDialogOpen, setOpenDialogOpen] = useState(false)
  const [closeDialogOpen, setCloseDialogOpen] = useState(false)
  const [openingFloat, setOpeningFloat] = useState('')
  const [countedCash, setCountedCash] = useState('')

  const handleOpenSession = async () => {
    if (!registerId) {
      toast.error('Selecciona una caja antes de abrirla')
      return
    }
    const float = parseFloat(openingFloat)
    if (Number.isNaN(float) || float < 0) {
      toast.error('Ingresa un monto de apertura válido')
      return
    }

    try {
      await openSessionMutation.mutateAsync({ cashRegisterId: registerId, openingFloat: float })
      setOpeningFloat('')
      setOpenDialogOpen(false)
      toast.success('Caja abierta')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al abrir la caja')
    }
  }

  const handleCloseSession = async () => {
    if (!session) return
    const counted = parseFloat(countedCash)
    if (Number.isNaN(counted) || counted < 0) {
      toast.error('Ingresa el efectivo contado')
      return
    }

    try {
      await closeSessionMutation.mutateAsync({ id: session.id, data: { countedCash: counted } })
      setCountedCash('')
      setCloseDialogOpen(false)
      toast.success('Caja cerrada')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al cerrar la caja')
    }
  }

  if (!registerId) {
    return <p className="text-sm text-slate-500">Selecciona una caja para continuar.</p>
  }

  if (sessionLoading) {
    return <p className="text-sm text-slate-500">Verificando caja…</p>
  }

  if (!session) {
    return (
      <>
        <div className="flex items-center justify-between gap-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2">
          <span className="text-sm text-amber-800">No hay una caja abierta para este local.</span>
          <Button size="sm" onClick={() => setOpenDialogOpen(true)}>
            Abrir caja
          </Button>
        </div>
        <Dialog open={openDialogOpen} onOpenChange={setOpenDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Abrir caja</DialogTitle>
              <DialogDescription>Ingresa el monto inicial en efectivo para comenzar a vender.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label htmlFor="opening-float">Monto de apertura</Label>
                <Input
                  id="opening-float"
                  type="number"
                  min={0}
                  step="0.01"
                  value={openingFloat}
                  onChange={(e) => setOpeningFloat(e.target.value)}
                />
              </div>
              <Button
                className="w-full"
                onClick={handleOpenSession}
                disabled={openSessionMutation.isPending}
              >
                {openSessionMutation.isPending ? 'Abriendo...' : 'Abrir caja'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  const countedValue = parseFloat(countedCash)
  const difference = report && !Number.isNaN(countedValue) ? countedValue - report.expectedCash : null

  return (
    <>
      <div className="flex items-center justify-between gap-3 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-emerald-500 text-emerald-700">
            Caja abierta
          </Badge>
          <span className="text-sm text-emerald-800">Apertura: {formatCurrency(session.openingFloat, currency)}</span>
        </div>
        <Button size="sm" variant="outline" onClick={() => setCloseDialogOpen(true)}>
          Cerrar caja
        </Button>
      </div>
      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cerrar caja</DialogTitle>
            <DialogDescription>Contá el efectivo en caja e ingresá el monto para el arqueo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Efectivo esperado: {report ? formatCurrency(report.expectedCash, currency) : 'Calculando...'}
            </p>
            <div>
              <Label htmlFor="counted-cash">Efectivo contado</Label>
              <Input
                id="counted-cash"
                type="number"
                min={0}
                step="0.01"
                value={countedCash}
                onChange={(e) => setCountedCash(e.target.value)}
              />
            </div>
            {difference !== null && (
              <p className={`text-sm ${difference < 0 ? 'text-red-600' : 'text-green-600'}`}>
                Diferencia: {formatCurrency(difference, currency)}
              </p>
            )}
            <Button className="w-full" onClick={handleCloseSession} disabled={closeSessionMutation.isPending}>
              {closeSessionMutation.isPending ? 'Cerrando...' : 'Cerrar caja'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
