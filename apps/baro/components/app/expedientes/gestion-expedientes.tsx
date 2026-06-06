'use client'

import type { SVGProps } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Download, Pencil, Plus, Trash2 } from 'lucide-react'
import { DatePicker } from '@/components/ui/date-picker'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { deleteExpediente } from '@/lib/expediente/actions/delete'
import { formatFechaActa, type ExpedienteFilters, type ExpedienteRow } from '@/lib/expediente/table'

function IconSearch(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
      {...props}
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
    </svg>
  )
}

function IconFilter(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
      {...props}
    >
      <path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" />
    </svg>
  )
}

function ExpedientesColGroup() {
  return (
    <colgroup>
      <col style={{ width: '20%' }} />
      <col style={{ width: '20%' }} />
      <col style={{ width: '11%' }} />
      <col style={{ width: '11%' }} />
      <col style={{ width: '26%' }} />
      <col style={{ width: '12%' }} />
    </colgroup>
  )
}

export function GestionExpedientesFilters({
  draft,
  onDraftChange,
  onFiltrar,
}: {
  draft: ExpedienteFilters
  onDraftChange: (f: ExpedienteFilters) => void
  onFiltrar: () => void
}) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
      <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 lg:min-w-[14rem]">
        <IconSearch className="h-4 w-4 shrink-0 text-[var(--color-muted)]" />
        <input
          type="text"
          value={draft.q}
          onChange={(e) => onDraftChange({ ...draft, q: e.target.value })}
          placeholder="Titular, Nomenclatura…"
          className="min-w-0 flex-1 bg-transparent text-sm text-[var(--color-heading)] outline-none placeholder:text-[var(--color-muted)]"
        />
      </label>
      <DatePicker
        variant="compact"
        value={draft.from}
        onChange={(v) => onDraftChange({ ...draft, from: v })}
        placeholder="Desde"
      />
      <DatePicker
        variant="compact"
        value={draft.to}
        onChange={(v) => onDraftChange({ ...draft, to: v })}
        placeholder="Hasta"
      />
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onFiltrar}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--muted-bg)] text-[var(--color-heading)] shadow-[var(--shadow-soft)] transition-colors hover:border-[var(--accent-bright)]/35 hover:bg-[var(--color-background)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-bright)] lg:shrink-0"
          >
            <IconFilter className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent>Filtrar</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href="/expedientes/nueva"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--color-cta)] text-[var(--color-cta-foreground)] hover:bg-[var(--color-cta-hover)]"
          >
            <Plus className="h-5 w-5" />
          </Link>
        </TooltipTrigger>
        <TooltipContent>Nuevo expediente</TooltipContent>
      </Tooltip>
    </div>
  )
}

export function GestionExpedientes({
  rows,
  loadingRows,
}: {
  rows: ExpedienteRow[]
  loadingRows?: number
}) {
  const router = useRouter()
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteConfirm = async () => {
    if (!confirmId) return
    setIsDeleting(true)
    const fd = new FormData()
    fd.set('id', confirmId)
    const result = await deleteExpediente(undefined, fd)
    setIsDeleting(false)
    if (result.ok) {
      setConfirmId(null)
      router.refresh()
    }
  }

  return (
    <>
      <div className="flex-1 overflow-x-auto">
        <Table className="h-full min-w-[56rem]">
          <ExpedientesColGroup />
          <TableHeader>
            <TableRow className="border-b border-[var(--color-border)] bg-[var(--color-muted)]/10 text-center text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
              <TableHead className="px-4 py-3 text-center">Titular / Ordenante</TableHead>
              <TableHead className="px-4 py-3 text-center">Profesional / Estudio</TableHead>
              <TableHead className="px-4 py-3 text-center">Fecha Acta</TableHead>
              <TableHead className="px-4 py-3 text-center">Nomenclatura</TableHead>
              <TableHead className="px-4 py-3 text-center">Ubicación</TableHead>
              <TableHead className="px-4 py-3 text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-[var(--color-border)]">
            {loadingRows ? (
              Array.from({ length: loadingRows }).map((_, i) => (
                <TableRow key={i} className="bg-[var(--color-background)]">
                  <TableCell className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="block h-9 w-9 animate-pulse rounded-full bg-[var(--color-muted)]/20" />
                      <span className="block h-4 w-32 animate-pulse rounded bg-[var(--color-muted)]/20" />
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <span className="block h-4 w-20 animate-pulse rounded bg-[var(--color-muted)]/20" />
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <span className="block h-4 w-28 animate-pulse rounded bg-[var(--color-muted)]/20" />
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <span className="block h-4 w-36 animate-pulse rounded bg-[var(--color-muted)]/20" />
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <span className="block h-4 w-40 animate-pulse rounded bg-[var(--color-muted)]/20" />
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <span className="block h-7 w-16 animate-pulse rounded bg-[var(--color-muted)]/20" />
                  </TableCell>
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="px-4 py-8 text-center text-sm text-[var(--color-muted)]"
                >
                  No hay expedientes que coincidan con los filtros.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="bg-[var(--color-background)] transition-colors hover:bg-[var(--color-muted)]/5"
                >
                  <TableCell className="max-w-[14rem] px-4 py-3 font-medium text-[var(--color-heading)]">
                    {row.titular}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-[var(--color-heading)]">
                        {row.profesionalNombre}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap px-4 py-3 text-[var(--color-muted)]">
                    {formatFechaActa(row.fechaActa)}
                  </TableCell>
                  <TableCell className="px-4 py-3 font-mono text-xs text-[var(--color-heading)]">
                    {row.nomenclatura}
                  </TableCell>
                  <TableCell className="max-w-[18rem] px-4 py-3 text-[var(--color-muted)]">
                    {row.ubicacion}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <div className="flex items-center justify-end gap-0.5">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link
                            href={`/expedientes/${row.id}/descargar`}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--accent-bright)]/40 text-[var(--accent-bright)] transition-colors hover:border-[var(--accent-bright)] hover:bg-[var(--accent-bright)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-bright)]"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent>Descargar archivos</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link
                            href={`/expedientes/${row.id}`}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-heading)]/60 transition-colors hover:border-[var(--color-heading)]/40 hover:bg-[var(--color-muted)]/10 hover:text-[var(--color-heading)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-bright)]"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent>Editar expediente</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => setConfirmId(row.id)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-300 text-red-400 transition-colors hover:border-red-400 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Eliminar expediente</TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <AlertDialog
        open={confirmId !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar expediente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminarán el expediente y todos sus datos
              (colindantes, relaciones de título, etc.).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? 'Eliminando…' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
