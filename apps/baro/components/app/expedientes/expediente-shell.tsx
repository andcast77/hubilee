'use client'

import { useTransition, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { omit } from '@/lib/utils'
import {
  ArrowLeft,
  ClipboardList,
  Download,
  FileText,
  MapPinned,
  Megaphone,
  Save,
  type LucideIcon,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  ExpedienteDatosGeneralesForm,
  type ExpedienteDatosSnapshot,
  type ProfessionalForForm,
} from '@/components/app/expedientes/expediente-datos-generales-form'
import { actaNotarialFechaDbToForm } from '@/lib/expediente/acta-notarial-fecha'
import {
  buildExpedienteQueryString,
  expedienteSectionMeta,
  normalizeExpedienteSeccion,
  type ExpedienteSeccion,
} from '@/lib/expediente/ui-shell'
import { cn } from '@/lib/utils'
import {
  ExpedienteColindantesPanel,
  type ExpedienteColindanteRow,
} from '@/components/app/expedientes/expediente-colindantes-panel'
import {
  ExpedienteLinderoPanel,
  type LinderosInitial,
} from '@/components/app/expedientes/expediente-lindero-panel'
import {
  ExpedientePublicacionActaPanel,
  type ExpedientePublicacionActaSnapshot,
} from '@/components/app/expedientes/expediente-publicacion-acta-panel'
import {
  ExpedienteProvider,
  useExpedienteStore,
  type DatosFields,
  type PublicacionFields,
  type ColRow,
  type OrdenanteRow,
  type LinderosFields,
} from '@/stores/expediente-store'
import {
  updateExpedienteFull,
  type UpdateExpedienteFullState,
} from '@/lib/expediente/actions/update-all'

// ─── header actions (inside provider) ───────────────────────────────────────

function HeaderActions({ expedienteId }: { expedienteId: string }) {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<UpdateExpedienteFullState | null>(null)
  const router = useRouter()

  const {
    expedienteId: id,
    datos,
    publicacion,
    colindantes,
    ordenantes,
    linderos,
  } = useExpedienteStore((s) => s)

  const handleSave = () => {
    startTransition(async () => {
      const { puntos, ...linderosRest } = linderos
      const r = await updateExpedienteFull({
        expedienteId: id,
        datos,
        publicacion,
        colindantes: colindantes.map((row) => {
          const { nomenclaturas, ...rest } = row
          return {
            ...omit(rest, '_key'),
            nomenclaturas: nomenclaturas.map((n) => omit(n, '_key')),
          }
        }),
        titulos: [],
        ordenantes: ordenantes.map((row) => omit(row, '_key')),
        linderos: { ...linderosRest, puntos: puntos.map((row) => omit(row, '_key')) },
      })
      setResult(r)
      if (r.ok) router.refresh()
    })
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={handleSave}
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
              href={`/expedientes/${expedienteId}/descargar`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--accent-bright)]/40 text-[var(--accent-bright)] transition-colors hover:border-[var(--accent-bright)] hover:bg-[var(--accent-bright)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-bright)]"
            >
              <Download className="h-4 w-4" />
            </Link>
          </TooltipTrigger>
          <TooltipContent>Descargar archivos</TooltipContent>
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

      {result && !result.ok && result.message ? (
        <p className="text-xs text-red-600 dark:text-red-400" role="alert">
          {result.message}
        </p>
      ) : null}
      {result?.ok ? (
        <p className="text-xs text-emerald-700 dark:text-emerald-400" role="status">
          {result.message}
        </p>
      ) : null}
    </div>
  )
}

const expedienteSectionIcons: Record<ExpedienteSeccion, LucideIcon> = {
  datos: ClipboardList,
  publicacion: Megaphone,
  titulo: FileText,
  colindantes: MapPinned,
}

// ─── tabs content ────────────────────────────────────────────────────────────

function ExpedienteTabs({
  professionals,
}: {
  professionals: ProfessionalForForm[]
}) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const active = normalizeExpedienteSeccion(searchParams.get('seccion'))

  const handleChange = (value: string) => {
    router.replace(`${pathname}?${buildExpedienteQueryString(value as ExpedienteSeccion)}`)
  }

  return (
    <Tabs
      value={active}
      onValueChange={handleChange}
      activationMode="manual"
      className="expediente-folder-tabs flex min-h-0 flex-1 flex-col gap-0 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--background)] shadow-[var(--shadow-soft)] ring-1 ring-[var(--app-panel-ring)]"
    >
      <div className="expediente-folder-tabs__rail relative shrink-0 overflow-hidden rounded-t-2xl bg-[var(--color-muted-bg)]">
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-20 w-4 bg-gradient-to-l from-[var(--color-muted-bg)] to-transparent sm:w-6"
          aria-hidden
        />
        <TabsList
          variant="line"
          className={cn(
            'relative z-10 flex h-auto w-full min-w-0 flex-nowrap items-end justify-start gap-0',
            'overflow-x-auto overscroll-x-contain scroll-smooth rounded-none bg-transparent p-0',
            '[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
            'px-0 pt-0'
          )}
        >
          {expedienteSectionMeta.map((s) => {
            const Icon = expedienteSectionIcons[s.id]
            return (
              <TabsTrigger
                key={s.id}
                value={s.id}
                className={cn(
                  'h-full shrink-0 gap-1.5 sm:gap-2',
                  'text-xs sm:text-sm',
                  'focus-visible:ring-2 focus-visible:ring-[var(--accent-bright)]/35'
                )}
              >
                <Icon className="size-3.5 shrink-0 sm:size-4" strokeWidth={2} aria-hidden />
                <span className="sm:hidden">{s.shortLabel}</span>
                <span className="hidden sm:inline">{s.label}</span>
              </TabsTrigger>
            )
          })}
        </TabsList>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--background)] p-5 sm:p-6">
        <TabsContent value="datos">
          <ExpedienteDatosGeneralesForm professionals={professionals} />
        </TabsContent>
        <TabsContent value="colindantes">
          <ExpedienteColindantesPanel />
        </TabsContent>
        <TabsContent value="titulo">
          <ExpedienteLinderoPanel />
        </TabsContent>
        <TabsContent value="publicacion">
          <ExpedientePublicacionActaPanel />
        </TabsContent>
      </div>
    </Tabs>
  )
}

// ─── public shell ────────────────────────────────────────────────────────────

export function ExpedienteShell({
  tipo,
  fecha,
  datosSnapshot,
  colindantes,
  ordenantes,
  linderos,
  publicacionActa,
  professionals,
}: {
  tipo: string
  fecha: string
  datosSnapshot: ExpedienteDatosSnapshot
  colindantes: ExpedienteColindanteRow[]
  ordenantes: OrdenanteRow[]
  linderos: LinderosInitial
  publicacionActa: ExpedientePublicacionActaSnapshot
  professionals: ProfessionalForForm[]
}) {
  const initialDatos: DatosFields = {
    actuantesIds: [...datosSnapshot.actuantesProfessionalIds],
    objetoExpedienteId: datosSnapshot.objetoExpedienteId,
    nomenclaturaCatastral: datosSnapshot.nomenclaturaCatastral,
    planoAntecedente: datosSnapshot.planoAntecedente ?? '',
    loteFraccion: datosSnapshot.loteFraccion ?? '',
    domicilioParcela: datosSnapshot.domicilioParcela ?? '',
    parcial: datosSnapshot.parcial,
    soloOrdenTrabajo: datosSnapshot.soloOrdenTrabajo,
    fechaOrdenTrabajo: datosSnapshot.fechaOrdenTrabajo ?? '',
    propietario: datosSnapshot.propietario,
    domicilioPropietario: datosSnapshot.domicilioPropietario ?? '',
    inscripcionDominio: datosSnapshot.inscripcionDominio ?? '',
    naturalezaActo: datosSnapshot.naturalezaActo ?? '',
    memoriaObservaciones: datosSnapshot.memoriaObservaciones ?? '',
    motivoHidraulica: datosSnapshot.motivoHidraulica ?? '',
    motivoFiscalia: datosSnapshot.motivoFiscalia ?? '',
    municipio: datosSnapshot.municipio ?? '',
    requiereVisacionMunicipal: datosSnapshot.requiereVisacionMunicipal,
  }

  const initialPublicacion: PublicacionFields = {
    publicacionEdictoFecha: publicacionActa.publicacionEdictoFecha ?? '',
    publicacionEdictoNumero: publicacionActa.publicacionEdictoNumero ?? '',
    boletinOficialNota: publicacionActa.boletinOficialNota ?? '',
    actaNotarialNumero: publicacionActa.actaNotarialNumero ?? '',
    actaNotarialFecha: actaNotarialFechaDbToForm(publicacionActa.actaNotarialFecha),
    publicacionActaObservaciones: publicacionActa.publicacionActaObservaciones ?? '',
    lugarReunion: publicacionActa.lugarReunion ?? '',
    toleranciaActa: publicacionActa.toleranciaActa ?? '',
    llevPublicacionEdictos: publicacionActa.llevPublicacionEdictos ?? false,
    medioPublicacion: publicacionActa.medioPublicacion ?? '',
  }

  const initialColindantes: ColRow[] = colindantes.map((c) => ({
    _key: c.id,
    id: c.id,
    nomenclaturas:
      c.nomenclaturas.length > 0
        ? c.nomenclaturas.map((n) => ({
            _key: n.id,
            id: n.id,
            nomenclatura: n.nomenclatura ?? '',
            rumbo: n.rumbo ?? '',
          }))
        : [{ _key: `nm-${c.id}-0`, id: null, nomenclatura: '', rumbo: '' }],
    distancia: c.distancia,
    colindante: c.colindante,
    descripcion: c.descripcion ?? '',
    notificaA: c.notificaA,
    domicilioParcelaColindante: c.domicilioParcelaColindante ?? '',
    domicilioTitularColindante: c.domicilioTitularColindante ?? '',
    dirigidoA: c.dirigidoA ?? '',
  }))

  const emptyLinderos: LinderosFields = {
    id: null,
    superficieTotal: '',
    superficieSegun: '',
    fechaRelacionTitulos: '',
    observacionesGenerales: '',
    puntos: [],
  }

  return (
    <ExpedienteProvider
      initial={{
        expedienteId: datosSnapshot.id,
        datos: initialDatos,
        publicacion: initialPublicacion,
        colindantes: initialColindantes,
        titulos: [],
        ordenantes,
        linderos: linderos ?? emptyLinderos,
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden">
        <header className="flex shrink-0 items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm text-[var(--color-muted)]">
              {tipo} · {fecha}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-heading)] sm:text-3xl">
              {datosSnapshot.nomenclaturaCatastral}
            </h1>
          </div>
          <HeaderActions expedienteId={datosSnapshot.id} />
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <ExpedienteTabs professionals={professionals} />
        </div>
      </div>
    </ExpedienteProvider>
  )
}
