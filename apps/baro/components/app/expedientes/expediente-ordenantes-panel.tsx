'use client'

import { useId, useState } from 'react'
import { CreditCard, MapPin, Pencil, Plus, Trash2, UserCheck, UserRound } from 'lucide-react'
import { cn } from '@/lib/utils'
import { derivarCuit, sanitizeDniInput } from '@/lib/format'
import {
  ORDENANTE_CARACTER_OPTIONS,
  ORDENANTE_SEXO_OPTIONS,
} from '@/lib/expediente/catalogs'
import { useExpedienteStore, type OrdenanteRow } from '@/stores/expediente-store'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// ─── helper types ──────────────────────────────────────────────────────────

export type OrdenanteDraft = {
  nombre: string
  documento: string
  sexo: string
  cuit: string
  domicilio: string
  caracter: string
  esPropietario: boolean
}

export type OrdenanteFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'add' | 'edit'
  draft: OrdenanteDraft
  onDraftChange: (draft: OrdenanteDraft) => void
  onSave: () => void
  lockedPropietario?: boolean
  entityLabel?: string
}

// ─── helpers ───────────────────────────────────────────────────────────────

export function emptyDraft(): OrdenanteDraft {
  return {
    nombre: '',
    documento: '',
    sexo: '',
    cuit: '',
    domicilio: '',
    caracter: '',
    esPropietario: false,
  }
}

export function draftFromRow(row: OrdenanteRow): OrdenanteDraft {
  return {
    nombre: row.nombre,
    documento: row.documento,
    sexo: row.sexo,
    cuit: row.cuit,
    domicilio: row.domicilio,
    caracter: row.caracter,
    esPropietario: row.esPropietario,
  }
}

export function isDraftValid(draft: OrdenanteDraft, skipCaracter = false): boolean {
  const nameOk = draft.nombre.trim().length > 0
  const docOk = draft.documento.trim().length > 0
  const caracterOk = skipCaracter || draft.caracter.trim().length > 0
  // domicilio is optional for simplicity
  return nameOk && docOk && caracterOk
}

export function applyCuitDerivation(draft: OrdenanteDraft): OrdenanteDraft {
  const cuit = derivarCuit(draft.documento, draft.sexo)
  return cuit ? { ...draft, cuit } : draft
}

// ─── exported CSS classes ──────────────────────────────────────────────────

const iconActionFocus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-bright)]'

export const editActionClass = cn(
  'inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md border border-[var(--color-border)]',
  'text-[var(--accent-bright)] shadow-[var(--shadow-soft)] transition-colors hover:bg-[var(--color-muted-bg)]/50',
  iconActionFocus
)

export const removeActionClass = cn(
  'inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md border border-red-500/30',
  'text-red-600 transition-colors hover:bg-red-500/10',
  iconActionFocus
)
export const addButtonClass =
  'inline-flex h-auto min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] py-2.5 shadow-[var(--shadow-soft)] sm:w-auto bg-[var(--background)] px-4 text-sm font-medium text-[var(--color-heading)] transition-colors hover:bg-[var(--color-muted-bg)]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-bright)]/30'

// ─── dialog component ──────────────────────────────────────────────────────

export function OrdenanteFormDialog({
  open,
  onOpenChange,
  mode,
  draft,
  onDraftChange,
  onSave,
  lockedPropietario = false,
  entityLabel,
}: OrdenanteFormDialogProps) {
  const baseId = useId()
  const canSave = isDraftValid(draft, lockedPropietario)

  // pasamos a mayúscula la primera letra
  const label = entityLabel ?? 'ordenante'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'add' ? `Agregar ${label}` : `Editar ${label}`}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {/* nombre */}
          <fieldset className="flex flex-col gap-1.5">
            <Label htmlFor={`${baseId}-nombre`}>
              Nombre y apellido <span className="text-[var(--color-danger)]">*</span>
            </Label>
            <Input
              id={`${baseId}-nombre`}
              value={draft.nombre}
              onChange={(e) => onDraftChange({ ...draft, nombre: e.target.value })}
              placeholder="Nombre completo"
            />
          </fieldset>

          {/* documento + sexo */}
          <div className="flex flex-wrap items-start gap-3">
            <fieldset className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Label htmlFor={`${baseId}-documento`}>
                Documento <span className="text-[var(--color-danger)]">*</span>
              </Label>
              <Input
                id={`${baseId}-documento`}
                value={draft.documento}
                onChange={(e) => {
                  const sanitized = sanitizeDniInput(e.target.value)
                  const updated = { ...draft, documento: sanitized }
                  onDraftChange(applyCuitDerivation(updated))
                }}
                placeholder="DNI"
                maxLength={8}
              />
            </fieldset>
            <fieldset className="flex min-w-0 flex-[0.6] flex-col gap-1.5">
              <Label htmlFor={`${baseId}-sexo`}>Sexo</Label>
              <Select
                value={draft.sexo}
                onValueChange={(value) => {
                  const updated = { ...draft, sexo: value }
                  onDraftChange(applyCuitDerivation(updated))
                }}
              >
                <SelectTrigger id={`${baseId}-sexo`} className="min-h-10 !h-10 w-full rounded-xl">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent position="popper" className="min-w-(--radix-select-trigger-width)">
                  {ORDENANTE_SEXO_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </fieldset>
          </div>

          {/* caracter */}
          {!lockedPropietario && (
            <fieldset className="flex flex-col gap-1.5">
              <Label htmlFor={`${baseId}-caracter`}>
                Carácter <span className="text-[var(--color-danger)]">*</span>
              </Label>
              <Select
                value={draft.caracter}
                onValueChange={(value) => onDraftChange({ ...draft, caracter: value })}
              >
                <SelectTrigger id={`${baseId}-caracter`} className="min-h-10 !h-10 w-full rounded-xl">
                  <SelectValue placeholder="Seleccionar carácter" />
                </SelectTrigger>
                <SelectContent position="popper" className="min-w-(--radix-select-trigger-width)">
                  {ORDENANTE_CARACTER_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </fieldset>
          )}

          {/* es propietario */}
          {!lockedPropietario && (
            <fieldset className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`${baseId}-esPropietario`}
                checked={draft.esPropietario}
                onChange={(e) => onDraftChange({ ...draft, esPropietario: e.target.checked })}
                className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--accent-bright)] focus:ring-[var(--accent)]"
              />
              <Label htmlFor={`${baseId}-esPropietario`} className="cursor-pointer text-sm font-normal !mt-0">
                Es propietario
              </Label>
            </fieldset>
          )}

          {/* cuit (read-only, derived) */}
          <fieldset className="flex flex-col gap-1.5">
            <Label htmlFor={`${baseId}-cuit`}>CUIT</Label>
            <Input id={`${baseId}-cuit`} value={draft.cuit} readOnly className="cursor-default" />
          </fieldset>

          {/* domicilio */}
          <fieldset className="flex flex-col gap-1.5">
            <Label htmlFor={`${baseId}-domicilio`}>Domicilio</Label>
            <Input
              id={`${baseId}-domicilio`}
              value={draft.domicilio}
              onChange={(e) => onDraftChange({ ...draft, domicilio: e.target.value })}
              placeholder="Domicilio real"
            />
          </fieldset>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={!canSave} onClick={onSave}>
            {mode === 'add' ? `Agregar ${label}` : `Guardar cambios`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── panel component ───────────────────────────────────────────────────────

export function ExpedienteOrdenantesPanel() {
  const ordenantes = useExpedienteStore((s) => s.ordenantes)
  const setOrdenantes = useExpedienteStore((s) => s.setOrdenantes)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [draft, setDraft] = useState<OrdenanteDraft>(emptyDraft)

  const rows = ordenantes

  const openAdd = () => {
    setEditingKey(null)
    setDraft(emptyDraft())
    setDialogOpen(true)
  }

  const openEdit = (row: OrdenanteRow) => {
    setEditingKey(row._key)
    setDraft(draftFromRow(row))
    setDialogOpen(true)
  }

  const removeRow = (key: string) => {
    setOrdenantes(rows.filter((r) => r._key !== key))
  }

  const handleSave = () => {
    if (!isDraftValid(draft)) return

    const existing = editingKey ? rows.find((r) => r._key === editingKey) : undefined

    const payload: OrdenanteRow = {
      _key: editingKey ?? `${rows.length}-${Date.now()}`,
      id: existing?.id ?? null,
      nombre: draft.nombre.trim(),
      documento: draft.documento.trim(),
      sexo: draft.sexo,
      cuit: draft.cuit,
      domicilio: draft.domicilio.trim(),
      caracter: draft.caracter.trim(),
      esPropietario: draft.esPropietario,
    }

    if (editingKey) {
      setOrdenantes(rows.map((r) => (r._key === editingKey ? payload : r)))
    } else {
      setOrdenantes([...rows, payload])
    }

    setDialogOpen(false)
    setEditingKey(null)
    setDraft(emptyDraft())
  }

  return (
    <div className="relative flex flex-col gap-4">
      {rows.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">No hay ordenantes cargados.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <li key={row._key}>
              <Card
                size="sm"
                className="gap-0 bg-[var(--color-muted-bg)]/20 py-0 shadow-[var(--shadow-soft)] ring-[var(--color-border)]"
              >
                <CardHeader className="shrink-0 border-b border-[var(--color-border)] pb-3">
                  <CardTitle className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 pr-2 text-[var(--color-heading)]">
                    {row.nombre.trim() || 'Sin nombre'}
                    {row.esPropietario && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex cursor-default items-center">
                            <UserCheck className="h-4 w-4 text-[var(--accent-bright)]" aria-hidden />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>Es propietario</TooltipContent>
                      </Tooltip>
                    )}
                  </CardTitle>
                  <CardAction>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className={editActionClass}
                        onClick={() => openEdit(row)}
                        aria-label={`Editar a ${row.nombre.trim() || 'ordenante'}`}
                      >
                        <Pencil className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                      </button>
                      <button
                        type="button"
                        className={removeActionClass}
                        onClick={() => removeRow(row._key)}
                        aria-label={`Quitar a ${row.nombre.trim() || 'ordenante'}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                      </button>
                    </div>
                  </CardAction>
                </CardHeader>
                <CardContent className="min-h-0 overflow-y-auto py-3">
                  <p className="text-sm text-[var(--color-muted)]">{row.caracter}</p>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-muted)]">
                    <span className="inline-flex items-center gap-1">
                      <UserRound
                        className="h-3.5 w-3.5 shrink-0 text-[var(--accent-bright)]"
                        aria-hidden
                      />
                      DNI {row.documento}
                      {row.sexo.trim() ? ` · ${row.sexo}` : null}
                    </span>
                    {row.cuit.trim() ? (
                      <span className="inline-flex items-center gap-1">
                        <CreditCard
                          className="h-3.5 w-3.5 shrink-0 text-[var(--accent-bright)]"
                          aria-hidden
                        />
                        <span className="font-mono text-[var(--color-heading)]">{row.cuit}</span>
                      </span>
                    ) : null}
                    <span className="inline-flex min-w-0 items-center gap-1">
                      <MapPin
                        className="h-3.5 w-3.5 shrink-0 text-[var(--accent-bright)]"
                        aria-hidden
                      />
                      <span className="truncate">{row.domicilio}</span>
                    </span>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <div className="flex justify-start flex-1">
        <button type="button" onClick={openAdd} className={addButtonClass}>
          <Plus
            className="h-3.5 w-3.5 shrink-0 text-[var(--accent-bright)]"
            strokeWidth={2}
            aria-hidden
          />
          Agregar ordenante
        </button>
      </div>

      <OrdenanteFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={editingKey ? 'edit' : 'add'}
        draft={draft}
        onDraftChange={setDraft}
        onSave={handleSave}
      />
    </div>
  )
}
