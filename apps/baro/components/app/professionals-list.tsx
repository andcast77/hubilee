'use client'

import { useState } from 'react'
import { useAccount } from '@/components/app/account-context'
import type {
  ApiProfessionalListItem,
  TitleGrammarChoice,
} from '@/components/app/professional-profile-form'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Ban, Check, Loader2, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import Link from 'next/link'

export type ProfessionalsListProps = {
  professionals: ApiProfessionalListItem[]
  /** ID del profesional titular (el que viene del perfil del usuario) */
  titularId: string | null
  /** ID del profesional que es actualmente el principal (para optimista) */
  currentPrincipalId?: string | null
  /** Callback cuando el usuario selecciona un profesional como principal */
  onSetPrincipal?: (professionalId: string) => void
  /** Tras eliminar con éxito (actualizar listado local sin recargar la ruta). */
  onProfessionalRemoved?: (professionalId: string) => void
  /** Cantidad de skeleton rows a mostrar */
  loadingRows?: number
  /** Texto de búsqueda aplicado (ya filtrado externamente) */
  q?: string
}

function titleLabel(t: 'AGRIMENSOR' | 'INGENIERO_AGRIMENSOR', grammar: TitleGrammarChoice): string {
  const fem = grammar === 'FEMENINO'
  if (t === 'INGENIERO_AGRIMENSOR') return fem ? 'Ing. Agrimensora' : 'Ing. Agrimensor'
  return fem ? 'Agrimensora' : 'Agrimensor'
}

function IconSearch(props: React.SVGProps<SVGSVGElement>) {
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

export function ProfessionalsListSearch({
  q,
  onQChange,
}: {
  q: string
  onQChange: (q: string) => void
}) {
  return (
    <div className="flex items-center gap-3">
      <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 lg:min-w-[14rem]">
        <IconSearch className="h-4 w-4 shrink-0 text-[var(--color-muted)]" />
        <input
          type="text"
          value={q}
          onChange={(e) => onQChange(e.target.value)}
          placeholder="Buscar profesional…"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--color-muted)]"
        />
      </label>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href="/profesionales/nuevo"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--color-cta)] text-[var(--color-cta-foreground)] hover:bg-[var(--color-cta-hover)]"
          >
            <Plus className="h-5 w-5" />
          </Link>
        </TooltipTrigger>
        <TooltipContent>Nuevo profesional</TooltipContent>
      </Tooltip>
    </div>
  )
}

export function ProfessionalsList({
  professionals,
  titularId,
  currentPrincipalId: externalPrincipalId,
  onSetPrincipal,
  onProfessionalRemoved,
  loadingRows,
  q,
}: ProfessionalsListProps) {
  const { refresh: refreshAccount } = useAccount()
  const currentPrincipalId = externalPrincipalId ?? titularId
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [activeStates, setActiveStates] = useState<Record<string, boolean>>({})
  const filtered = professionals

  function getActive(p: ApiProfessionalListItem): boolean {
    if (activeStates[p.id] !== undefined) return activeStates[p.id]
    return p.active !== false
  }

  async function tryToggleActive(id: string, currentlyActive: boolean) {
    setTogglingId(id)

    const res = await fetch(`/api/auth/associated-professionals/${id}/active`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !currentlyActive }),
    })

    if (res.ok) {
      setActiveStates((prev) => ({ ...prev, [id]: !currentlyActive }))
    } else {
      const data = res.json().catch(() => ({})) as { message?: string }
      alert(data.message ?? 'No se pudo cambiar el estado.')
    }

    setTogglingId(null)
  }

  async function handleRemove(id: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/auth/associated-professionals/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string }
        alert(data.message ?? 'No se pudo eliminar.')
        return
      }
      onProfessionalRemoved?.(id)
      await refreshAccount({ silent: true })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-x-auto">
        <Table className="h-full min-w-[30rem]">
          <TableHeader>
            <TableRow className="border-b border-[var(--color-border)] bg-[var(--color-muted)]/10 text-center text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
              <TableHead className="px-4 py-3 text-center">Nombre</TableHead>
              <TableHead className="px-4 py-3 text-center">Título</TableHead>
              <TableHead className="px-4 py-3 text-center">Matrículas</TableHead>
              <TableHead className="px-4 py-3 text-center">Estado</TableHead>
              <TableHead className="px-4 py-3 text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-[var(--color-border)]">
            {loadingRows ? (
              Array.from({ length: loadingRows }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="px-4 py-3">
                    <span className="block h-4 w-40 animate-pulse rounded bg-[var(--color-muted)]/20" />
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <span className="block h-4 w-24 animate-pulse rounded bg-[var(--color-muted)]/20" />
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <span className="block h-4 w-32 animate-pulse rounded bg-[var(--color-muted)]/20" />
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <span className="block h-4 w-16 animate-pulse rounded bg-[var(--color-muted)]/20" />
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <div className="flex gap-1">
                      <span className="block h-8 w-8 animate-pulse rounded bg-[var(--color-muted)]/20" />
                      <span className="block h-8 w-8 animate-pulse rounded bg-[var(--color-muted)]/20" />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="px-4 py-8 text-center text-sm text-[var(--color-muted)]"
                >
                  {q?.trim() ? 'No se encontraron profesionales' : 'No hay profesionales cargados'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => {
                const isPrincipal = p.id === currentPrincipalId

                return (
                  <TableRow
                    key={p.id}
                    className="bg-[var(--color-background)] transition-colors hover:bg-[var(--color-muted)]/5"
                  >
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[var(--color-heading)]">
                          {p.displayName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-[var(--color-foreground)]">
                      {titleLabel(p.professionalTitle, p.titleGrammarGender ?? 'MASCULINO')}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-[var(--color-foreground)]">
                      {p.registrations && p.registrations.length > 0 ? (
                        <div className="flex flex-col">
                          {p.registrations.map((r) => (
                            <span key={r.id} className="font-mono text-xs">
                              {r.licenseNumber} — {r.jurisdiction}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[var(--color-muted)]">—</span>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      {isPrincipal ? (
                        <span className="text-xs font-medium text-[var(--accent-bright)]">
                          Titular
                        </span>
                      ) : getActive(p) ? (
                        <span className="text-xs text-green-600">Activo</span>
                      ) : !getActive(p) ? (
                        <span className="text-xs text-red-600">Inactivo</span>
                      ) : (
                        <span className="text-xs text-[var(--color-muted)]">—</span>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {/* Botón hacer principal (solo si está activo) */}
                        {!isPrincipal && getActive(p) && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                aria-label="Hacer principal"
                                className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-[var(--accent-bright)]/40 text-[var(--accent-bright)] transition-colors hover:border-[var(--accent-bright)] hover:bg-[var(--accent-bright)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-bright)]"
                                onClick={() => onSetPrincipal?.(p.id)}
                              >
                                <Star className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>Hacer titular</TooltipContent>
                          </Tooltip>
                        )}
                        {/* Botón activar/desactivar (no para principal) */}
                        {!isPrincipal && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                aria-label={getActive(p) ? 'Desactivar' : 'Activar'}
                                className={`inline-flex h-7 w-7 items-center justify-center rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50 ${getActive(p) ? 'border-orange-200 text-orange-600 hover:bg-orange-50 focus-visible:ring-orange-400' : 'border-green-200 text-green-600 hover:bg-green-50 focus-visible:ring-green-400'}`}
                                onClick={() => tryToggleActive(p.id, getActive(p))}
                                disabled={togglingId === p.id}
                              >
                                {togglingId === p.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : !getActive(p) ? (
                                  <Check className="h-4 w-4" />
                                ) : (
                                  <Ban className="h-4 w-4" />
                                )}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {getActive(p) ? 'Desactivar' : 'Activar'}
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {/* Botón editar */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link
                              href={`/profesionales/${p.id}/editar`}
                              aria-label="Editar"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-heading)]/60 transition-colors hover:border-[var(--color-heading)]/40 hover:bg-[var(--color-muted)]/10 hover:text-[var(--color-heading)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-bright)]"
                            >
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent>Editar</TooltipContent>
                        </Tooltip>
                        {/* Botón eliminar — con AlertDialog */}
                        <AlertDialog>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AlertDialogTrigger asChild>
                                <button
                                  type="button"
                                  aria-label="Eliminar"
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-300 text-red-400 transition-colors hover:border-red-400 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:opacity-50"
                                  disabled={deletingId === p.id}
                                >
                                  {deletingId === p.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </button>
                              </AlertDialogTrigger>
                            </TooltipTrigger>
                            <TooltipContent>Eliminar</TooltipContent>
                          </Tooltip>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar profesional?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Vas a eliminar a <strong>{p.displayName}</strong>. Esta acción no se
                                puede deshacer.
                                {isPrincipal && (
                                  <span className="mt-1 block">
                                    Este profesional es el <strong>titular de la cuenta</strong>. Al
                                    eliminarlo, la cuenta quedará sin titular asignado.
                                  </span>
                                )}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRemove(p.id)}
                                className="bg-destructive/10 text-destructive hover:bg-destructive/20"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {filtered.length > 0 && (
        <p className="mt-2 text-right text-xs text-[var(--color-muted)]">
          {filtered.length} profesional{filtered.length !== 1 ? 'es' : ''}
          {q?.trim() ? ` de ${professionals.length}` : ''}
        </p>
      )}
    </div>
  )
}
