'use client'

import { Megaphone } from 'lucide-react'
import {
  parseActaNotarialFechaDate,
  parseActaNotarialFechaTime,
  combineActaNotarialFecha,
  toleranceMinutesToDisplay,
  parseToleranciaToMinutes,
  clampTolerance
} from '@/lib/expediente/acta-notarial-fecha'
import { useExpedienteStore } from '@/stores/expediente-store'
import { DatePicker } from '@/components/ui/date-picker'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ExpedienteFormSection,
  FormSubsectionTitle,
} from '@/components/app/expedientes/expediente-form-section'

export const MEDIO_PUBLICACION_OPTIONS = [
  'Diario de Cuyo',
  'Diario El Zonda',
  'Boletín Oficial',
] as const

export type ExpedientePublicacionActaSnapshot = {
  publicacionEdictoFecha: string | null
  publicacionEdictoNumero: string | null
  boletinOficialNota: string | null
  actaNotarialNumero: string | null
  actaNotarialFecha: string | null
  publicacionActaObservaciones: string | null
  lugarReunion: string | null
  toleranciaActa: string | null
  llevPublicacionEdictos: boolean
  medioPublicacion: string | null
}

export function ExpedientePublicacionActaPanel() {
  const pub = useExpedienteStore((s) => s.publicacion)
  const setPublicacion = useExpedienteStore((s) => s.setPublicacion)
  
  // Extract time part from actaNotarialFecha for input type="time"
  const timeStr = parseActaNotarialFechaTime(pub.actaNotarialFecha) || '00:00'

  return (
    <ExpedienteFormSection
      icon={Megaphone}
      title="Publicación y acta"
      description="Datos del acta notarial y publicación de edictos."
      featured
    >
      <div className="space-y-8">
        <div className="space-y-4">
           <FormSubsectionTitle>Acta notarial</FormSubsectionTitle>

           {/* Row 1: Date + Time + Tolerance + Lugar (1:1:1:3) */}
           <div className="grid gap-4 grid-cols-[1fr_1fr_1fr_7fr]">
              {/* DatePicker */}
              <Field className="min-w-0">
                <FieldLabel>Fecha de acta</FieldLabel>
                <DatePicker
                  value={parseActaNotarialFechaDate(pub.actaNotarialFecha)}
                  onChange={(newDate) => {
                    setPublicacion({
                      actaNotarialFecha: combineActaNotarialFecha(
                        newDate,
                        parseActaNotarialFechaTime(pub.actaNotarialFecha) || '00:00'
                      ),
                    })
                  }}
                />
              </Field>

                {/* Time input */}
                <Field className="min-w-0">
                  <FieldLabel>Hora</FieldLabel>
                  <Input
                    type="time"
                    autoComplete="off"
                    className="cursor-pointer"
                    value={timeStr}
                    onChange={(e) => {
                      setPublicacion({
                        actaNotarialFecha: combineActaNotarialFecha(
                          parseActaNotarialFechaDate(pub.actaNotarialFecha),
                          e.target.value
                        ),
                      })
                    }}
                  />
                </Field>

                {/* Tolerancia */}
                <Field className="min-w-0">
                  <FieldLabel>Tolerancia</FieldLabel>
                  <div className="flex h-10 w-full items-center gap-0 rounded-xl border border-[var(--color-border)]/80 bg-background px-1">
                    <button
                      type="button"
                      onClick={() => {
                        const v = clampTolerance(parseToleranciaToMinutes(pub.toleranciaActa) - 30)
                        setPublicacion({ toleranciaActa: toleranceMinutesToDisplay(v) })
                      }}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm font-medium text-[var(--color-muted)] hover:bg-[var(--color-muted-bg)] hover:text-[var(--color-heading)] transition-colors"
                    >
                      −
                    </button>
                    <div className="flex flex-1 items-center justify-center gap-1">
                      <input
                        type="number"
                        min={30}
                        max={240}
                        step={30}
                        value={parseToleranciaToMinutes(pub.toleranciaActa)}
                        onChange={(e) => {
                          const v = clampTolerance(Number(e.target.value) || 30)
                          setPublicacion({ toleranciaActa: toleranceMinutesToDisplay(v) })
                        }}
                        className="w-14 border-none bg-transparent text-center text-sm font-medium text-[var(--color-heading)] tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:hidden focus:outline-none"
                      />
                      <span className="text-xs text-[var(--color-muted)]">min</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const v = clampTolerance(parseToleranciaToMinutes(pub.toleranciaActa) + 30)
                        setPublicacion({ toleranciaActa: toleranceMinutesToDisplay(v) })
                      }}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm font-medium text-[var(--color-muted)] hover:bg-[var(--color-muted-bg)] hover:text-[var(--color-heading)] transition-colors"
                    >
                      +
                    </button>
                  </div>
                </Field>

              {/* Lugar de reunión — ~mitad del ancho (3fr de 6fr total) */}
              <Field className="min-w-0">
                <FieldLabel>Lugar de reunión</FieldLabel>
                <Input
                  autoComplete="off"
                  value={pub.lugarReunion}
                  onChange={(e) => setPublicacion({ lugarReunion: e.target.value })}
                />
              </Field>
            </div>

           {/* Edictos row: checkbox + conditional fields */}
           <div className="flex flex-nowrap items-end gap-4">
             <label className="flex h-10 cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl border border-[var(--color-border)]/80 bg-[var(--color-muted-bg)]/20 px-3 text-sm">
               <input
                 type="checkbox"
                 checked={pub.llevPublicacionEdictos}
                 onChange={(e) => setPublicacion({ llevPublicacionEdictos: e.target.checked })}
                 className="h-4 w-4 accent-[var(--accent-bright)]"
               />
               <span>Edicto</span>
             </label>
             {pub.llevPublicacionEdictos && (
               <>
                 <Field className="w-auto shrink-0">
                   <FieldLabel>Fecha publicación de edicto</FieldLabel>
                   <DatePicker
                     value={pub.publicacionEdictoFecha}
                     onChange={(v) => setPublicacion({ publicacionEdictoFecha: v })}
                   />
                 </Field>
                  <Field className="w-auto shrink-0">
                    <FieldLabel>Medio de publicación</FieldLabel>
                    <Select
                      value={pub.medioPublicacion}
                      onValueChange={(v) => setPublicacion({ medioPublicacion: v })}
                    >
                      <SelectTrigger className="min-h-10 !h-10 w-full rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent position="popper" className="min-w-(--radix-select-trigger-width)">
                        {MEDIO_PUBLICACION_OPTIONS.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
               </>
             )}
           </div>
        </div>
      </div>
    </ExpedienteFormSection>
  )
}
