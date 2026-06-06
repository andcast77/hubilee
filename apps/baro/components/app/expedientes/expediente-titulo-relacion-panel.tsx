'use client'

import { useId, useRef } from 'react'
import { Trash2 } from 'lucide-react'
import { Plus } from 'lucide-react'
import { useExpedienteStore, type TitRow } from '@/stores/expediente-store'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { DatePicker } from '@/components/ui/date-picker'
import { Field, FieldLabel } from '@/components/ui/field'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { FormSubsectionTitle } from '@/components/app/expedientes/expediente-form-section'
import {
  removeActionClass,
  addButtonClass,
} from '@/components/app/expedientes/expediente-ordenantes-panel'

export function ExpedienteTituloRelacionPanel() {
  const rows = useExpedienteStore((s) => s.titulos)
  const setTitulos = useExpedienteStore((s) => s.setTitulos)
  const counter = useRef(rows.length)
  const baseId = useId()

  const addRow = () => {
    setTitulos([
      ...rows,
      {
        _key: `new-${counter.current++}`,
        id: null,
        instrumento: '',
        matricula: '',
        fechaTitulo: '',
        observaciones: '',
      },
    ])
  }

  const removeRow = (key: string) => setTitulos(rows.filter((r) => r._key !== key))

  const setField = (key: string, field: keyof Omit<TitRow, '_key' | 'id'>, value: string) =>
    setTitulos(rows.map((r) => (r._key === key ? { ...r, [field]: value } : r)))

  return (
    <div className="space-y-4">
      <FormSubsectionTitle>Relación de títulos</FormSubsectionTitle>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--background)]/50 px-4 py-6 text-sm text-[var(--color-muted)]">
          No hay vínculos cargados. Podés agregar el primero con el botón de abajo.
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
                    Vínculo {i + 1}
                  </CardTitle>
                  <CardAction>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className={removeActionClass}
                        onClick={() => removeRow(row._key)}
                        aria-label="Eliminar vínculo"
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                      </button>
                    </div>
                  </CardAction>
                </CardHeader>
                <CardContent className="min-h-0 overflow-y-auto py-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field className="min-w-0 sm:col-span-2">
                      <FieldLabel>Instrumento / acto *</FieldLabel>
                      <Input
                        id={`${baseId}-${row._key}-instrumento`}
                        autoComplete="off"
                        value={row.instrumento}
                        onChange={(e) => setField(row._key, 'instrumento', e.target.value)}
                      />
                    </Field>
                    <Field className="min-w-0">
                      <FieldLabel>Matrícula / folio</FieldLabel>
                      <Input
                        id={`${baseId}-${row._key}-matricula`}
                        autoComplete="off"
                        value={row.matricula}
                        onChange={(e) => setField(row._key, 'matricula', e.target.value)}
                      />
                    </Field>
                    <Field className="min-w-0">
                      <FieldLabel>Fecha</FieldLabel>
                      <DatePicker
                        value={row.fechaTitulo}
                        onChange={(v) => setField(row._key, 'fechaTitulo', v ?? '')}
                      />
                    </Field>
                    <Field className="min-w-0 sm:col-span-2">
                      <FieldLabel>Observaciones (opcional)</FieldLabel>
                      <Textarea
                        id={`${baseId}-${row._key}-observaciones`}
                        rows={2}
                        value={row.observaciones}
                        onChange={(e) => setField(row._key, 'observaciones', e.target.value)}
                      />
                    </Field>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={addRow}
        className={addButtonClass}
      >
        <Plus
          className="h-3.5 w-3.5 shrink-0 text-[var(--accent-bright)]"
          strokeWidth={2}
          aria-hidden
        />
        Agregar vínculo
      </button>
    </div>
  )
}
