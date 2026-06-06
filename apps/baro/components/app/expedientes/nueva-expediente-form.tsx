'use client'

import Link from 'next/link'
import { useTransition, useState } from 'react'
import { ArrowLeft, Save } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  ExpedienteDatosGeneralesForm,
  type ProfessionalForForm,
} from '@/components/app/expedientes/expediente-datos-generales-form'
import { ExpedienteOrdenantesPanel } from '@/components/app/expedientes/expediente-ordenantes-panel'
import { cn } from '@/lib/utils'
import { ExpedienteProvider, useExpedienteStore, type DatosFields } from '@/stores/expediente-store'
import { submitExpedienteNueva } from '@/lib/expediente/actions/nueva'
import {
  CLIENT_VALIDATION_HEADER_MESSAGE,
  validateExpedienteNuevaDatos,
} from '@/lib/expediente/validate-nueva-client'

// ─── empty data factories ─────────────────────────────────────────────────────

/** Actuantes por defecto: titular si sigue activo en el roster; si no, primer profesional activo. */
function initialActuantesIds(
  titularId: string | null,
  professionals: ProfessionalForForm[]
): string[] {
  const active = professionals.filter((p) => p.active)
  if (active.length === 0) return []
  if (titularId) {
    const hit = active.find((p) => p.id === titularId)
    if (hit) return [hit.id]
  }
  return [active[0]!.id]
}

function makeEmptyDatos(actuantesIds: string[]): DatosFields {
  return {
    actuantesIds,
    objetoExpedienteId: '',
    nomenclaturaCatastral: '',
    planoAntecedente: '',
    loteFraccion: '',
    domicilioParcela: '',
    parcial: false,
    soloOrdenTrabajo: false,
    fechaOrdenTrabajo: '',
    propietario: '',
    domicilioPropietario: '',
    inscripcionDominio: '',
    naturalezaActo: '',
    memoriaObservaciones: '',
    motivoHidraulica: '',
    motivoFiscalia: '',
    municipio: '',
    requiereVisacionMunicipal: false,
  }
}

// ─── header actions (needs store) ────────────────────────────────────────────

function NuevaHeaderActions({
  isPending,
  errorMessage,
  onSave,
}: {
  isPending: boolean
  errorMessage?: string | null
  onSave: () => void
}) {
  return (
    <div className="flex shrink-0 flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onSave}
              disabled={isPending}
              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-heading)]/60 transition-colors hover:border-[var(--color-heading)]/40 hover:bg-[var(--color-muted)]/10 hover:text-[var(--color-heading)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-bright)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>{isPending ? 'Guardando…' : 'Guardar'}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/expedientes"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-heading)]/60 transition-colors hover:border-[var(--color-heading)]/40 hover:bg-[var(--color-muted)]/10 hover:text-[var(--color-heading)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-bright)]"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </TooltipTrigger>
          <TooltipContent>Volver a expedientes</TooltipContent>
        </Tooltip>
      </div>

      <p
        className={cn(
          'max-w-md min-h-10 text-right text-xs leading-5',
          errorMessage ? 'text-red-600 dark:text-red-400' : 'invisible select-none'
        )}
        role={errorMessage ? 'alert' : undefined}
        aria-live={errorMessage ? 'polite' : undefined}
        aria-hidden={errorMessage ? undefined : true}
      >
        <span className="line-clamp-2 block">{errorMessage ?? '\u00a0'}</span>
      </p>
    </div>
  )
}

// ─── inner shell (inside provider) ───────────────────────────────────────────

function NuevaShell({
  professionals,
}: {
  professionals: ProfessionalForForm[]
}) {
  const datos = useExpedienteStore((s) => s.datos)
  const ordenantes = useExpedienteStore((s) => s.ordenantes)
  const [isPending, startTransition] = useTransition()
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | undefined>()
  const [headerMessage, setHeaderMessage] = useState<string | null>(null)
  const [dismissedFieldErrors, setDismissedFieldErrors] = useState<Set<string>>(() => new Set())

  const dismissFieldError = (key: string) => {
    setDismissedFieldErrors((prev) => {
      if (prev.has(key)) return prev
      const next = new Set(prev)
      next.add(key)
      return next
    })
  }

  const handleSave = () => {
    const validation = validateExpedienteNuevaDatos(datos)
    if (!validation.ok) {
      setFieldErrors(validation.fieldErrors)
      setHeaderMessage(CLIENT_VALIDATION_HEADER_MESSAGE)
      setDismissedFieldErrors(new Set())
      return
    }

    setFieldErrors(undefined)
    setHeaderMessage(null)
    setDismissedFieldErrors(new Set())

    startTransition(async () => {
      const r = await submitExpedienteNueva(datos, ordenantes)
      if (!r.ok) {
        setHeaderMessage(r.message)
        setFieldErrors(r.fieldErrors)
        setDismissedFieldErrors(new Set())
      }
    })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden">
      <header className="flex shrink-0 items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-heading)] sm:text-3xl">
            Nuevo expediente
          </h1>
        </div>
        <NuevaHeaderActions
          isPending={isPending}
          errorMessage={headerMessage}
          onSave={handleSave}
        />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--background)]/90 p-5 shadow-[var(--shadow-soft)] ring-1 ring-[var(--app-panel-ring)] sm:p-6">
        <ExpedienteDatosGeneralesForm
          professionals={professionals}
          fieldErrors={fieldErrors}
          dismissedFieldErrors={dismissedFieldErrors}
          onDismissFieldError={dismissFieldError}
          ordenantesSlot={<ExpedienteOrdenantesPanel />}
        />
      </div>
    </div>
  )
}

// ─── public component ─────────────────────────────────────────────────────────

export function NuevaExpedienteForm({
  professionals,
  titularId,
}: {
  professionals: ProfessionalForForm[]
  titularId: string | null
}) {
  const actuantesIds = initialActuantesIds(titularId, professionals)
  const expedienteStoreKey = `${titularId ?? ''}|${professionals.map((p) => p.id).join(',')}`

  return (
    <ExpedienteProvider
      key={expedienteStoreKey}
      initial={{
        expedienteId: '',
        datos: makeEmptyDatos(actuantesIds),
        publicacion: {
          publicacionEdictoFecha: '',
          publicacionEdictoNumero: '',
          boletinOficialNota: '',
          actaNotarialNumero: '',
          actaNotarialFecha: '',
          publicacionActaObservaciones: '',
          lugarReunion: '',
          toleranciaActa: '',
          llevPublicacionEdictos: false,
          medioPublicacion: '',
        },
        colindantes: [],
        titulos: [],
        ordenantes: [],
        linderos: {
          id: null,
          superficieTotal: '',
          superficieSegun: '',
          fechaRelacionTitulos: '',
          observacionesGenerales: '',
          puntos: [],
        },
      }}
    >
      <NuevaShell professionals={professionals} />
    </ExpedienteProvider>
  )
}
