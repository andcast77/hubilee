'use client'

import { useRef, useState } from 'react'
import { Compass, MapPin, MapPinned, Pencil, Plus, Send, Trash2, UserRound } from 'lucide-react'
import { formatNomenclaturaCatastralInput } from '@/lib/format'
import { COLINDANTE_NOTIFICA_VALUES, type ColindanteNotifica } from '@/lib/expediente/schemas'
import { useExpedienteStore, type ColRow } from '@/stores/expediente-store'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ExpedienteFormSection } from '@/components/app/expedientes/expediente-form-section'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const CARDINALES = [
  'Norte',
  'Oeste',
  'Sur',
  'Este',
  'Noroeste',
  'Suroeste',
  'Sureste',
  'Noreste',
  'Norte, Este',
  'Norte, Este, Sur',
  'Este, Sur',
  'Este, Sur, Oeste',
  'Sur, Oeste',
  'Sur, Oeste, Norte',
  'Oeste, Norte',
  'Oeste, Norte, Este',
] as const

export type ExpedienteColindanteNomenclaturaRow = {
  id: string
  orden: number
  nomenclatura: string
  rumbo: string
}

export type ExpedienteColindanteRow = {
  id: string
  orden: number
  nomenclaturas: ExpedienteColindanteNomenclaturaRow[]
  distancia: string
  colindante: string
  descripcion: string | null
  notificaA: ColindanteNotifica
  domicilioParcelaColindante: string
  domicilioTitularColindante: string
  dirigidoA: string
}

const iconActionFocus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-bright)]'

const editActionClass = cn(
  'inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md border border-[var(--color-border)]',
  'text-[var(--accent-bright)] shadow-[var(--shadow-soft)] transition-colors hover:bg-[var(--color-muted-bg)]/50',
  iconActionFocus
)

const removeActionClass = cn(
  'inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md border border-red-500/30',
  'text-red-600 transition-colors hover:bg-red-500/10',
  iconActionFocus
)

const addButtonClass = cn(
  'inline-flex h-auto min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] py-2.5 shadow-[var(--shadow-soft)] sm:w-auto',
  'bg-[var(--background)] px-4 text-sm font-medium text-[var(--color-heading)] transition-colors',
  'hover:bg-[var(--color-muted-bg)]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-bright)]/30'
)

const inputClass =
  'w-full min-h-10 rounded-xl border border-[var(--color-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--color-heading)] shadow-[var(--shadow-soft)] outline-none transition-shadow focus-visible:border-[var(--accent-bright)]/50 focus-visible:ring-2 focus-visible:ring-[var(--accent-bright)]/30'

function handleNomenclaturaInput(raw: string): string {
  if (raw === '') return ''
  return formatNomenclaturaCatastralInput(raw)
}

// ─── Draft types ──────────────────────────────────────────────────────────

type NomenclaturaDraft = {
  _key: string
  id: string | null
  nomenclatura: string
  rumbo: string
}

type ColindanteDraft = {
  colindante: string
  notificaA: ColindanteNotifica
  nomenclaturas: NomenclaturaDraft[]
  descripcion: string
  domicilioParcelaColindante: string
  domicilioTitularColindante: string
  dirigidoA: string
}

let nmGlobalCounter = 0

function newNmKey() {
  return `nm-${nmGlobalCounter++}`
}

const emptyDraft = (): ColindanteDraft => ({
  colindante: '',
  notificaA: 'Particular',
  nomenclaturas: [{ _key: newNmKey(), id: null, nomenclatura: '', rumbo: '' }],
  descripcion: '',
  domicilioParcelaColindante: '',
  domicilioTitularColindante: '',
  dirigidoA: '',
})

function draftFromRow(row: ColRow): ColindanteDraft {
  return {
    colindante: row.colindante,
    notificaA: row.notificaA,
    nomenclaturas: row.nomenclaturas.map((n) => ({ ...n })),
    descripcion: row.descripcion,
    domicilioParcelaColindante: row.domicilioParcelaColindante,
    domicilioTitularColindante: row.domicilioTitularColindante,
    dirigidoA: row.dirigidoA,
  }
}

function isDraftValid(d: ColindanteDraft): boolean {
  return d.colindante.trim() !== ''
}

// ─── Dialog ────────────────────────────────────────────────────────────────

type ColindanteFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'add' | 'edit'
  draft: ColindanteDraft
  onDraftChange: (draft: ColindanteDraft) => void
  onSave: () => void
}

function ColindanteFormDialog({
  open,
  onOpenChange,
  mode,
  draft,
  onDraftChange,
  onSave,
}: ColindanteFormDialogProps) {
  const canSave = isDraftValid(draft)

  const setField = (field: keyof ColindanteDraft, value: string) => {
    onDraftChange({ ...draft, [field]: value })
  }

  const setNmField = (nmKey: string, field: 'nomenclatura' | 'rumbo', value: string) => {
    onDraftChange({
      ...draft,
      nomenclaturas: draft.nomenclaturas.map((nm) =>
        nm._key !== nmKey
          ? nm
          : {
              ...nm,
              [field]: field === 'nomenclatura' ? handleNomenclaturaInput(value) : value,
            }
      ),
    })
  }

  const addNomenclatura = () => {
    onDraftChange({
      ...draft,
      nomenclaturas: [
        ...draft.nomenclaturas,
        { _key: newNmKey(), id: null, nomenclatura: '', rumbo: '' },
      ],
    })
  }

  const removeNomenclatura = (nmKey: string) => {
    if (draft.nomenclaturas.length <= 1) return
    onDraftChange({
      ...draft,
      nomenclaturas: draft.nomenclaturas.filter((nm) => nm._key !== nmKey),
    })
  }

  const baseId = 'col-dialog'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,52rem)] max-w-2xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === 'add' ? 'Agregar colindante' : 'Editar colindante'}</DialogTitle>
        </DialogHeader>

        <div className="-mx-4 max-h-[55vh] overflow-y-auto px-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label
                htmlFor={`${baseId}-titular`}
                className="block text-xs font-medium text-[var(--color-muted)]"
              >
                Titular *
              </label>
              <input
                id={`${baseId}-titular`}
                className={`${inputClass} mt-1`}
                value={draft.colindante}
                onChange={(e) => setField('colindante', e.target.value)}
                autoComplete="off"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-muted)]">
                Nomenclaturas catastrales
              </label>
              <div className="space-y-2">
                {draft.nomenclaturas.map((nm) => (
                  <div
                    key={nm._key}
                    className={`grid ${draft.nomenclaturas.length > 1 ? 'grid-cols-[1fr_1fr_auto]' : 'grid-cols-[1fr_1fr]'} gap-2`}
                  >
                    <input
                      className={`${inputClass} min-w-0`}
                      value={nm.nomenclatura}
                      inputMode="numeric"
                      placeholder="N.C."
                      onChange={(e) => setNmField(nm._key, 'nomenclatura', e.target.value)}
                      autoComplete="off"
                    />
                    <Select value={nm.rumbo} onValueChange={(v) => setNmField(nm._key, 'rumbo', v)}>
                      <SelectTrigger className="min-h-10 !h-10 w-full rounded-xl">
                        <SelectValue placeholder="Punto cardinal" />
                      </SelectTrigger>
                      <SelectContent position="popper" className="min-w-(--radix-select-trigger-width)">
                        {CARDINALES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {draft.nomenclaturas.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removeNomenclatura(nm._key)}
                        className="inline-flex min-h-10 w-10 shrink-0 cursor-pointer items-center justify-center self-center rounded-md border border-red-500/30 text-red-600 transition-colors hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-bright)]"
                        aria-label="Quitar nomenclatura"
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                      </button>
                    ) : null}
                  </div>
                ))}
                <button
                  type="button"
                  className="text-xs font-medium text-[var(--accent-bright)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-bright)]/30 rounded"
                  onClick={addNomenclatura}
                >
                  + Agregar nomenclatura
                </button>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[var(--color-muted)]">
                Domicilio parcela (colindante)
              </label>
              <input
                className={`${inputClass} mt-1`}
                value={draft.domicilioParcelaColindante}
                onChange={(e) => setField('domicilioParcelaColindante', e.target.value)}
                autoComplete="street-address"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[var(--color-muted)]">
                Domicilio titular / colindante
              </label>
              <input
                className={`${inputClass} mt-1`}
                value={draft.domicilioTitularColindante}
                onChange={(e) => setField('domicilioTitularColindante', e.target.value)}
                autoComplete="street-address"
              />
            </div>

            <div className="sm:col-span-2">
              <Label>Notifica A</Label>
              <Select
                value={draft.notificaA}
                onValueChange={(v) => setField('notificaA', v as ColindanteNotifica)}
              >
                <SelectTrigger className="min-h-10 !h-10 w-full rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" className="min-w-(--radix-select-trigger-width)">
                  {COLINDANTE_NOTIFICA_VALUES.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {draft.notificaA === 'Fiscalía' ? (
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[var(--color-muted)]">
                  Dirigido a
                </label>
                <textarea
                  className={`${inputClass} mt-1 resize-y`}
                  rows={2}
                  value={draft.dirigidoA}
                  onChange={(e) => setField('dirigidoA', e.target.value)}
                />
              </div>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" disabled={!canSave} onClick={onSave}>
            {mode === 'add' ? 'Agregar' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Panel ────────────────────────────────────────────────────────────────

export function ExpedienteColindantesPanel() {
  const rows = useExpedienteStore((s) => s.colindantes)
  const setColindantes = useExpedienteStore((s) => s.setColindantes)
  const counter = useRef(rows.length)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [draft, setDraft] = useState<ColindanteDraft>(emptyDraft)

  const openAdd = () => {
    setEditingKey(null)
    setDraft(emptyDraft())
    setDialogOpen(true)
  }

  const openEdit = (row: ColRow) => {
    setEditingKey(row._key)
    setDraft(draftFromRow(row))
    setDialogOpen(true)
  }

  const removeRow = (key: string) => setColindantes(rows.filter((r) => r._key !== key))

  const handleSave = () => {
    if (!isDraftValid(draft)) return

    const payload = {
      colindante: draft.colindante.trim(),
      notificaA: draft.notificaA,
      nomenclaturas: draft.nomenclaturas.map((nm) => ({
        _key: nm._key,
        id: nm.id,
        nomenclatura: nm.nomenclatura.trim(),
        rumbo: nm.rumbo.trim(),
      })),
      descripcion: draft.descripcion.trim(),
      domicilioParcelaColindante: draft.domicilioParcelaColindante.trim(),
      domicilioTitularColindante: draft.domicilioTitularColindante.trim(),
      dirigidoA: draft.dirigidoA.trim(),
    }

    if (editingKey) {
      setColindantes(rows.map((r) => (r._key === editingKey ? { ...r, ...payload } : r)))
    } else {
      setColindantes([
        ...rows,
        {
          _key: `new-${counter.current++}`,
          id: null,
          distancia: '',
          ...payload,
        },
      ])
    }

    setDialogOpen(false)
    setEditingKey(null)
    setDraft(emptyDraft())
  }

  return (
    <ExpedienteFormSection
      icon={MapPinned}
      title="Colindantes"
      description="Gestioná los linderos del expediente"
      featured
    >
      <div className="relative flex flex-col gap-4">
        {rows.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">
            No hay colindantes cargados. Podés agregar el primero con el botón de abajo.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {rows.map((row, i) => (
              <li key={row._key}>
                <Card
                  size="sm"
                  className="gap-0 bg-[var(--color-muted-bg)]/20 py-0 shadow-[var(--shadow-soft)] ring-[var(--color-border)]"
                >
                  <CardHeader className="shrink-0 border-b border-[var(--color-border)] pb-3">
                    <CardTitle className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 pr-2 text-[var(--color-heading)]">
                      {row.colindante.trim() || `Colindante ${i + 1}`}
                    </CardTitle>
                    <CardAction>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className={editActionClass}
                          onClick={() => openEdit(row)}
                          aria-label={`Editar a ${row.colindante.trim() || `colindante ${i + 1}`}`}
                        >
                          <Pencil className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                        </button>
                        <button
                          type="button"
                          className={removeActionClass}
                          onClick={() => removeRow(row._key)}
                          aria-label={`Quitar a ${row.colindante.trim() || `colindante ${i + 1}`}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                        </button>
                      </div>
                    </CardAction>
                  </CardHeader>
                  <CardContent className="min-h-0 overflow-y-auto py-3">
                    <p className="text-xs text-[var(--color-muted)]">
                      <span className="inline-flex items-center gap-1">
                        <UserRound
                          className="h-3.5 w-3.5 shrink-0 text-[var(--accent-bright)]"
                          aria-hidden
                        />
                        <span className="font-semibold">Notifica a:</span> {row.notificaA}
                      </span>
                    </p>
                    {row.nomenclaturas.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-muted)]">
                        {row.nomenclaturas.map((nm) => (
                          <span key={nm._key} className="inline-flex items-center gap-1">
                            <Compass
                              className="h-3.5 w-3.5 shrink-0 text-[var(--accent-bright)]"
                              aria-hidden
                            />
                            <span className="font-semibold">N.C.:</span>{' '}
                            {nm.nomenclatura.trim() || 'N/C'}
                            {nm.rumbo.trim() ? ` (${nm.rumbo.trim()})` : ''}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-muted)]">
                      <span className="inline-flex items-center gap-1">
                        <MapPin
                          className="h-3.5 w-3.5 shrink-0 text-[var(--accent-bright)]"
                          aria-hidden
                        />
                        <span className="font-semibold">Domicilio parcela:</span>{' '}
                        {row.domicilioParcelaColindante.trim() || '—'}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-muted)]">
                      <span className="inline-flex items-center gap-1">
                        <MapPin
                          className="h-3.5 w-3.5 shrink-0 text-[var(--accent-bright)]"
                          aria-hidden
                        />
                        <span className="font-semibold">Domicilio titular:</span>{' '}
                        {row.domicilioTitularColindante.trim() || '—'}
                      </span>
                    </div>
                    {row.dirigidoA.trim() ? (
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-muted)]">
                        <span className="inline-flex items-center gap-1">
                          <Send
                            className="h-3.5 w-3.5 shrink-0 text-[var(--accent-bright)]"
                            aria-hidden
                          />
                          <span className="font-semibold">Dirigido a:</span> {row.dirigidoA.trim()}
                        </span>
                      </div>
                    ) : null}
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
            Agregar colindante
          </button>
        </div>

        <ColindanteFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          mode={editingKey ? 'edit' : 'add'}
          draft={draft}
          onDraftChange={setDraft}
          onSave={handleSave}
        />
      </div>
    </ExpedienteFormSection>
  )
}
