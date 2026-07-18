'use client'

import { useState } from 'react'
import {
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
import { useCashRegisters, useCreateCashRegister, useOpenCashSessionsByStore } from '@/hooks/useCashSession'
import { useUser } from '@/hooks/useUser'

interface RegisterSelectorProps {
  storeId: string | null
  registerId: string | null
  onChange: (registerId: string | null) => void
}

/**
 * FIX 1 (pos-cash-session, CRITICAL): lets the operator pick WHICH register (caja) they are
 * physically standing at — a store can have several registers, each with its own OPEN
 * session. The parent persists the selection (see `useSelectedRegisterId`) and binds
 * checkout/settlement to that exact register's session via `useOpenCashSession(storeId, registerId)`.
 * Also owns register creation, replacing `CashSessionBar`'s previous implicit
 * check-then-create of a default "Caja Principal" (a source of duplicate-register races —
 * the backend now also rejects duplicate names within a store as a safety net).
 */
export function RegisterSelector({ storeId, registerId, onChange }: RegisterSelectorProps) {
  const { data: registers = [], isLoading } = useCashRegisters(storeId)
  const { data: openSessions = [] } = useOpenCashSessionsByStore(storeId)
  const createRegisterMutation = useCreateCashRegister()
  const { data: currentUser } = useUser()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [newRegisterName, setNewRegisterName] = useState('')

  const openRegisterIds = new Set(openSessions.map((s) => s.cashRegisterId))

  // FIX C (pos-cash-session round 2, WARNING): `shopflow.cash-registers.create` is granted to
  // NO role — only the OWNER/ADMIN membership bypass can create a register (see
  // `core/permissions.ts`). Register provisioning is an admin setup task; showing the create UI
  // to everyone else just leads to a 403 dead-end.
  const canCreateRegister = currentUser?.isSuperuser === true
    || currentUser?.membershipRole === 'OWNER'
    || currentUser?.membershipRole === 'ADMIN'

  const handleCreate = async () => {
    if (!storeId || !newRegisterName.trim()) return
    try {
      const register = await createRegisterMutation.mutateAsync({ storeId, name: newRegisterName.trim() })
      setNewRegisterName('')
      setDialogOpen(false)
      onChange(register.id)
      toast.success('Caja creada')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al crear la caja')
    }
  }

  if (!storeId) return null

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="register-selector" className="whitespace-nowrap">
        Caja
      </Label>
      <select
        id="register-selector"
        className="min-w-[180px] rounded-md border border-gray-300 px-3 py-2 text-sm"
        value={registerId ?? ''}
        disabled={isLoading}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="" disabled>
          {isLoading ? 'Cargando cajas…' : 'Selecciona una caja'}
        </option>
        {registers.map((register) => (
          <option key={register.id} value={register.id}>
            {register.name} — {openRegisterIds.has(register.id) ? 'Abierta' : 'Cerrada'}
          </option>
        ))}
      </select>

      {canCreateRegister ? (
        <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
          + Nueva caja
        </Button>
      ) : !isLoading && registers.length === 0 ? (
        <span className="text-sm text-gray-500">
          Pedí a un administrador que cree la caja
        </span>
      ) : null}

      {canCreateRegister ? (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Nueva caja</DialogTitle>
              <DialogDescription>Crea un nuevo registro de caja para este local.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label htmlFor="new-register-name">Nombre</Label>
                <Input
                  id="new-register-name"
                  value={newRegisterName}
                  onChange={(e) => setNewRegisterName(e.target.value)}
                  placeholder="Caja Principal"
                />
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={createRegisterMutation.isPending || !newRegisterName.trim()}>
                {createRegisterMutation.isPending ? 'Creando...' : 'Crear'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  )
}
