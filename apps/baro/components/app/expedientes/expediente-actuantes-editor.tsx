'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronDown,
  ChevronUp,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Star,
  Trash2,
  UserPlus,
} from 'lucide-react'
import { professionalTitleLabel } from '@/lib/professional/display'
import { EXPEDIENTE_MAX_ACTUANTES } from '@/lib/expediente/ui-shell'
import {
  mapProfessionalToActuanteRow,
  type ActuanteProfessionalRow,
} from '@/lib/professional/actuante-row'
import {
  ProfessionalProfileForm,
  type ApiProfile,
} from '@/components/app/professional-profile-form'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'

import { cn } from '@/lib/utils'

export type { ActuanteProfessionalRow } from '@/lib/professional/actuante-row'

const iconActionFocus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-bright)]'

const editActionClass = cn(
  'inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md border border-[var(--color-border)]',
  'text-[var(--accent-bright)] shadow-[var(--shadow-soft)] transition-colors hover:bg-[var(--color-muted-bg)]/50',
  iconActionFocus
)

const reorderActionClass = cn(
  'inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md border border-[var(--color-border)]',
  'text-[var(--accent-bright)] shadow-[var(--shadow-soft)] transition-colors hover:bg-[var(--color-muted-bg)]/50',
  'disabled:pointer-events-none disabled:opacity-40',
  iconActionFocus
)

const removeActionClass = cn(
  'inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md border border-red-500/30',
  'text-red-600 transition-colors hover:bg-red-500/10',
  'disabled:pointer-events-none disabled:opacity-40',
  iconActionFocus
)

const addButtonClass = cn(
  'inline-flex h-auto min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] py-2.5 shadow-[var(--shadow-soft)] w-full sm:w-auto',
  'bg-[var(--background)] px-4 text-sm font-medium text-[var(--color-heading)] transition-colors',
  'hover:bg-[var(--color-muted-bg)]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-bright)]/30'
)

type Props = {
  professionals: ActuanteProfessionalRow[]
  actuantesIds: string[]
  onChange: (ids: string[]) => void
  onProfessionalCreated?: (row: ActuanteProfessionalRow) => void
  fieldError?: string
  /** Si se define, emite un `<input type="hidden" />` por id para forms HTML. */
  formFieldName?: string
}

const CREATE_FORM_ID = 'expediente-nuevo-profesional'
const EDIT_FORM_ID = 'expediente-editar-profesional'

export function ExpedienteActuantesEditor({
  professionals,
  actuantesIds: actuantesIdsProp,
  onChange,
  onProfessionalCreated,
  fieldError,
  formFieldName,
}: Props) {
  const router = useRouter()
  const actuantesIds = useMemo(
    () => (Array.isArray(actuantesIdsProp) ? actuantesIdsProp : []),
    [actuantesIdsProp]
  )
  const [pickOpen, setPickOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const activePros = useMemo(() => professionals.filter((p) => p.active), [professionals])
  const byId = useMemo(() => new Map(activePros.map((p) => [p.id, p])), [activePros])

  const validActuantesIds = useMemo(
    () => actuantesIds.filter((id) => byId.has(id)),
    [actuantesIds, byId]
  )

  useEffect(() => {
    if (
      validActuantesIds.length !== actuantesIds.length ||
      validActuantesIds.some((id, i) => id !== actuantesIds[i])
    ) {
      onChange(validActuantesIds)
    }
  }, [actuantesIds, validActuantesIds, onChange])

  const selectedRows = useMemo(() => {
    const out: ActuanteProfessionalRow[] = []
    for (const id of validActuantesIds) {
      const p = byId.get(id)
      if (p) out.push(p)
    }
    return out
  }, [validActuantesIds, byId])

  const remaining = useMemo(
    () => activePros.filter((p) => !validActuantesIds.includes(p.id)),
    [activePros, validActuantesIds]
  )

  const move = (index: number, dir: -1 | 1) => {
    const next = index + dir
    if (next < 0 || next >= validActuantesIds.length) return
    const copy = [...validActuantesIds]
    const t = copy[index]!
    copy[index] = copy[next]!
    copy[next] = t
    onChange(copy)
  }

  const removeId = (id: string) => {
    onChange(validActuantesIds.filter((x) => x !== id))
  }

  const addId = (id: string) => {
    if (validActuantesIds.includes(id)) return
    if (validActuantesIds.length >= EXPEDIENTE_MAX_ACTUANTES) return
    onChange([...validActuantesIds, id])
    setPickOpen(false)
  }

  const canAddMore = validActuantesIds.length < EXPEDIENTE_MAX_ACTUANTES
  const showReorderControls = validActuantesIds.length > 1

  const openAddFlow = () => {
    if (remaining.length > 0) {
      setPickOpen(true)
    } else {
      setCreateOpen(true)
    }
  }

  const profileToActuanteRow = (profile: ApiProfile, isTitular: boolean) =>
    mapProfessionalToActuanteRow(
      {
        id: profile.id,
        displayName: profile.displayName,
        professionalTitle: profile.professionalTitle,
        sexo: profile.sexo,
        locality: profile.locality,
        phone: profile.phone,
        professionalEmail: profile.professionalEmail,
        active: true,
        registrations: profile.registrations.map((r) => ({
          licenseNumber: r.licenseNumber,
          jurisdiction: r.jurisdiction,
          createdAt: new Date(0),
          bodyName: r.bodyName,
        })),
      },
      { isTitular }
    )

  const handleProfessionalCreated = (profile: ApiProfile) => {
    const row = profileToActuanteRow(profile, activePros.length === 0)
    onProfessionalCreated?.(row)
    if (!validActuantesIds.includes(row.id)) {
      onChange([...validActuantesIds, row.id])
    }
    setCreateOpen(false)
    setPickOpen(false)
    void router.refresh()
  }

  const openEdit = (id: string) => {
    setEditingId(id)
    setEditOpen(true)
  }

  const handleProfessionalEdited = (profile: ApiProfile) => {
    const existing = byId.get(profile.id)
    const row = profileToActuanteRow(profile, existing?.isTitular ?? false)
    onProfessionalCreated?.(row)
    setEditOpen(false)
    setEditingId(null)
    void router.refresh()
  }

  return (
    <div className="relative flex flex-col gap-4">
      {formFieldName
        ? validActuantesIds.map((id) => (
            <input type="hidden" name={formFieldName} value={id} key={id} />
          ))
        : null}

      {selectedRows.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">No hay actuantes seleccionados.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {selectedRows.map((p, index) => (
            <li key={p.id}>
              <Card
                size="sm"
                className="gap-0 bg-[var(--color-muted-bg)]/20 py-0 shadow-[var(--shadow-soft)] ring-[var(--color-border)]"
              >
                <CardHeader className="shrink-0 border-b border-[var(--color-border)] pb-3">
                  <CardTitle className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 pr-2 text-[var(--color-heading)]">
                    {p.displayName}
                    {p.isTitular ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex cursor-default items-center">
                            <Star className="h-4 w-4 text-[var(--accent-bright)]" aria-hidden />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>Titular de la cuenta</TooltipContent>
                      </Tooltip>
                    ) : null}
                  </CardTitle>
                  <CardAction>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className={editActionClass}
                        onClick={() => openEdit(p.id)}
                        aria-label={`Editar a ${p.displayName}`}
                      >
                        <Pencil className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                      </button>
                      {showReorderControls ? (
                        <>
                          <button
                            type="button"
                            className={reorderActionClass}
                            disabled={index === 0}
                            onClick={() => move(index, -1)}
                            aria-label={`Subir a ${p.displayName}`}
                          >
                            <ChevronUp className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                          </button>
                          <button
                            type="button"
                            className={reorderActionClass}
                            disabled={index === validActuantesIds.length - 1}
                            onClick={() => move(index, 1)}
                            aria-label={`Bajar a ${p.displayName}`}
                          >
                            <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                          </button>
                        </>
                      ) : null}
                      <button
                        type="button"
                        className={removeActionClass}
                        onClick={() => removeId(p.id)}
                        aria-label={`Quitar a ${p.displayName}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                      </button>
                    </div>
                  </CardAction>
                </CardHeader>
                <CardContent className="min-h-0 overflow-y-auto py-3">
                  <p className="text-sm text-[var(--color-muted)]">
                    {professionalTitleLabel(p.professionalTitle, p.titleGrammarGender)}
                    {p.primaryMatricula ? (
                      <>
                        {' · '}
                        <span className="font-mono text-[var(--color-heading)]">
                          {p.primaryMatricula}
                        </span>
                        {p.primaryJurisdiction ? (
                          <span className="text-[var(--color-muted)]">
                            {' '}
                            ({p.primaryJurisdiction})
                          </span>
                        ) : null}
                      </>
                    ) : null}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-muted)]">
                    <span className="inline-flex items-center gap-1">
                      <MapPin
                        className="h-3.5 w-3.5 shrink-0 text-[var(--accent-bright)]"
                        aria-hidden
                      />
                      {p.locality || '—'}
                    </span>
                    {p.phone ? (
                      <span className="inline-flex items-center gap-1">
                        <Phone
                          className="h-3.5 w-3.5 shrink-0 text-[var(--accent-bright)]"
                          aria-hidden
                        />
                        {p.phone}
                      </span>
                    ) : null}
                    {p.professionalEmail ? (
                      <span className="inline-flex min-w-0 items-center gap-1">
                        <Mail
                          className="h-3.5 w-3.5 shrink-0 text-[var(--accent-bright)]"
                          aria-hidden
                        />
                        <span className="truncate">{p.professionalEmail}</span>
                      </span>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {canAddMore ? (
        <>
          <div className="flex justify-start flex-1">
            <button type="button" onClick={openAddFlow} className={addButtonClass}>
              <Plus
                className="h-3.5 w-3.5 shrink-0 text-[var(--accent-bright)]"
                strokeWidth={2}
                aria-hidden
              />
              Agregar actuante
            </button>
          </div>

          <Dialog open={pickOpen} onOpenChange={setPickOpen}>
            <DialogContent className="max-h-[min(85vh,28rem)] max-w-md sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Agregar actuante</DialogTitle>
                <DialogDescription>
                  Elegí un profesional del estudio para sumar al expediente.
                </DialogDescription>
              </DialogHeader>
              <div className="-mx-4 max-h-[55vh] overflow-y-auto px-4">
                <ul className="space-y-1">
                  {remaining.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => addId(p.id)}
                        className="flex w-full cursor-pointer flex-col gap-0.5 rounded-xl border border-transparent px-3 py-2.5 text-left transition-colors hover:border-[var(--color-border)] hover:bg-[var(--color-muted-bg)]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-bright)]/30"
                      >
                        <span className="text-sm font-medium text-[var(--color-heading)]">
                          {p.displayName}
                        </span>
                        <span className="text-xs text-[var(--color-muted)]">
                          {professionalTitleLabel(p.professionalTitle, p.titleGrammarGender)}
                          {p.primaryMatricula ? ` · ${p.primaryMatricula}` : ''}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <DialogFooter className="sm:flex-col">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2 border-dashed border-[var(--accent-bright)]/40 bg-[var(--color-accent-soft)]/20 hover:border-[var(--accent-bright)]/60 hover:bg-[var(--color-accent-soft)]/35"
                  onClick={() => {
                    setPickOpen(false)
                    setCreateOpen(true)
                  }}
                >
                  <UserPlus className="h-4 w-4 text-[var(--accent-bright)]" aria-hidden />
                  Crear profesional nuevo
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogContent className="max-h-[min(90vh,52rem)] max-w-2xl sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nuevo profesional</DialogTitle>
                <DialogDescription>
                  Se guardará en tu estudio y se sumará como actuante en este expediente.
                </DialogDescription>
              </DialogHeader>
              <div className="-mx-4 max-h-[55vh] overflow-y-auto px-4">
                <ProfessionalProfileForm
                  variant="collaborator"
                  collaboratorId={null}
                  embedded
                  embeddedActions="external"
                  formId={CREATE_FORM_ID}
                  onCancel={() => setCreateOpen(false)}
                  onCollaboratorSaved={handleProfessionalCreated}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" form={CREATE_FORM_ID}>
                  Guardar y agregar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      ) : null}

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open)
          if (!open) setEditingId(null)
        }}
      >
        <DialogContent className="max-h-[min(90vh,52rem)] max-w-2xl sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar profesional</DialogTitle>
          </DialogHeader>
          <div className="-mx-4 max-h-[55vh] overflow-y-auto px-4">
            {editingId ? (
              <ProfessionalProfileForm
                key={editingId}
                variant="collaborator"
                collaboratorId={editingId}
                embedded
                embeddedActions="external"
                formId={EDIT_FORM_ID}
                onCancel={() => {
                  setEditOpen(false)
                  setEditingId(null)
                }}
                onCollaboratorSaved={handleProfessionalEdited}
              />
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditOpen(false)
                setEditingId(null)
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" form={EDIT_FORM_ID}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {fieldError ? (
        <span className="absolute bottom-0 left-0 right-0 -mb-5 text-xs text-red-500 text-sm">
          {fieldError}
        </span>
      ) : null}
    </div>
  )
}
