'use client'

import { useRef } from 'react'
import { FileText, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useExpedienteStore,
  type LinderosFields,
  type LinderoPuntoRow,
} from '@/stores/expediente-store'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { DatePicker } from '@/components/ui/date-picker'
import { Field, FieldLabel } from '@/components/ui/field'
import {
  ExpedienteFormSection,
  FormSubsectionTitle,
} from '@/components/app/expedientes/expediente-form-section'
import { ExpedienteTituloRelacionPanel } from '@/components/app/expedientes/expediente-titulo-relacion-panel'
import {
  removeActionClass,
  addButtonClass,
} from '@/components/app/expedientes/expediente-ordenantes-panel'

export type LinderosInitial = LinderosFields | null

export const CARDINAL_DIRECTIONS = ['Norte', 'Sur', 'Este', 'Oeste'] as const
export const ESPECIAL_DIRECTIONS = ['Noreste', 'Noroeste', 'Sureste', 'Suroeste'] as const

function PuntosGroup({
  tipo,
  allDirections,
  groupRows,
  onAdd,
  onDelete,
  onSetField,
}: {
  tipo: 'CARDINAL' | 'ESPECIAL'
  allDirections: readonly string[]
  groupRows: LinderoPuntoRow[]
  onAdd: () => void
  onDelete: (key: string) => void
  onSetField: (key: string, field: 'direccion' | 'descripcion' | 'medida', value: string) => void
}) {
  const label = tipo === 'CARDINAL' ? 'cardinal' : 'especial'
  const addDisabled = allDirections.every((d) => groupRows.some((r) => r.direccion === d))

  return (
    <div className="space-y-3">
      {groupRows.map((row) => {
        const usedByOthers = new Set(
          groupRows.filter((r) => r._key !== row._key).map((r) => r.direccion)
        )
        const options = [
          row.direccion,
          ...allDirections.filter((d) => d !== row.direccion && !usedByOthers.has(d)),
        ]
        return (
          <div key={row._key} className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-2">
            <Select
              value={row.direccion}
              onValueChange={(v) => onSetField(row._key, 'direccion', v)}
            >
              <SelectTrigger className="min-h-10 !h-10 w-full rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" className="min-w-(--radix-select-trigger-width)">
                {options.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={row.descripcion}
              onChange={(e) => onSetField(row._key, 'descripcion', e.target.value)}
              aria-label="Descripción"
              autoComplete="off"
            />
            <Input
              value={row.medida}
              onChange={(e) => onSetField(row._key, 'medida', e.target.value)}
              aria-label="Medida"
              autoComplete="off"
            />
            <button
              type="button"
              className={removeActionClass}
              onClick={() => onDelete(row._key)}
              aria-label={`Eliminar punto ${label}`}
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            </button>
          </div>
        )
      })}
      <div className="flex justify-start flex-1">
        <button
          type="button"
          onClick={onAdd}
          disabled={addDisabled}
          className={cn(addButtonClass, 'disabled:cursor-not-allowed disabled:opacity-50')}
        >
          <Plus
            className="h-3.5 w-3.5 shrink-0 text-[var(--accent-bright)]"
            strokeWidth={2}
            aria-hidden
          />
          Agregar punto {label}
        </button>
      </div>
    </div>
  )
}

export function ExpedienteLinderoPanel() {
  const linderos = useExpedienteStore((s) => s.linderos)
  const setLinderos = useExpedienteStore((s) => s.setLinderos)
  const counter = useRef(0)

  const cardinalRows = linderos.puntos.filter((p) => p.tipo === 'CARDINAL')
  const especialRows = linderos.puntos.filter((p) => p.tipo === 'ESPECIAL')

  const addPunto = (tipo: 'CARDINAL' | 'ESPECIAL') => {
    const allDirs = tipo === 'CARDINAL' ? CARDINAL_DIRECTIONS : ESPECIAL_DIRECTIONS
    const used = new Set(linderos.puntos.filter((p) => p.tipo === tipo).map((p) => p.direccion))
    const dir = allDirs.find((d) => !used.has(d))
    if (!dir) return
    setLinderos({
      puntos: [
        ...linderos.puntos,
        {
          _key: `new-${counter.current++}`,
          id: null,
          tipo,
          direccion: dir,
          descripcion: '',
          medida: '',
        },
      ],
    })
  }

  const deletePunto = (key: string) => {
    setLinderos({ puntos: linderos.puntos.filter((p) => p._key !== key) })
  }

  const setPuntoField = (
    key: string,
    field: 'direccion' | 'descripcion' | 'medida',
    value: string
  ) => {
    setLinderos({
      puntos: linderos.puntos.map((p) => (p._key === key ? { ...p, [field]: value } : p)),
    })
  }

  return (
    <ExpedienteFormSection
      icon={FileText}
      title="Relación de títulos y linderos"
      description="Datos de la cadena de dominio, superficie y puntos de linderos."
      featured
    >
      <div className="space-y-8">
        <div className="space-y-4">
          <FormSubsectionTitle>Datos generales</FormSubsectionTitle>
          <div className="flex flex-wrap items-end gap-4">
            <Field className="w-auto shrink-0">
              <FieldLabel>Superficie Total</FieldLabel>
              <Input
                autoComplete="off"
                placeholder="mts2"
                value={linderos.superficieTotal}
                onChange={(e) => setLinderos({ superficieTotal: e.target.value })}
              />
            </Field>
            <Field className="w-auto shrink-0">
              <FieldLabel>Superficie según</FieldLabel>
              <Select
                value={linderos.superficieSegun}
                onValueChange={(v) => setLinderos({ superficieSegun: v })}
              >
                <SelectTrigger className="min-h-10 !h-10 w-full rounded-xl">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent position="popper" className="min-w-(--radix-select-trigger-width)">
                  {(['Título', 'Mensura'] as const).map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field className="w-auto shrink-0">
              <FieldLabel>Fecha de relación de títulos</FieldLabel>
              <DatePicker
                value={linderos.fechaRelacionTitulos}
                onChange={(v) => setLinderos({ fechaRelacionTitulos: v ?? '' })}
              />
            </Field>
          </div>
          <div className="w-full">
            <FieldLabel>Observaciones Generales</FieldLabel>
            <Textarea
              className="mt-1 min-h-[100px] rounded-xl border-[var(--color-border)] text-[var(--color-heading)] focus-visible:ring-[var(--accent-bright)]"
              rows={3}
              value={linderos.observacionesGenerales}
              onChange={(e) => setLinderos({ observacionesGenerales: e.target.value })}
            />
          </div>
        </div>

        <ExpedienteTituloRelacionPanel />

        <div className="space-y-4 border-t border-[var(--color-border)] pt-8">
          <FormSubsectionTitle>Puntos cardinales</FormSubsectionTitle>
          <PuntosGroup
            tipo="CARDINAL"
            allDirections={CARDINAL_DIRECTIONS}
            groupRows={cardinalRows}
            onAdd={() => addPunto('CARDINAL')}
            onDelete={deletePunto}
            onSetField={setPuntoField}
          />
        </div>

        <div className="space-y-4 border-t border-[var(--color-border)] pt-8">
          <FormSubsectionTitle>Puntos especiales</FormSubsectionTitle>
          <PuntosGroup
            tipo="ESPECIAL"
            allDirections={ESPECIAL_DIRECTIONS}
            groupRows={especialRows}
            onAdd={() => addPunto('ESPECIAL')}
            onDelete={deletePunto}
            onSetField={setPuntoField}
          />
        </div>
      </div>
    </ExpedienteFormSection>
  )
}
