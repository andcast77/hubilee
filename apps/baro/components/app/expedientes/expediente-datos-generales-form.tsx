'use client'

import React from 'react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  ClipboardList,
  CreditCard,
  Droplets,
  FileText,
  Gavel,
  MapPin,
  MapPinned,
  Pencil,
  Plus,
  Scale,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react'
import { NOMENCLATURA_CATASTRAL } from '@/lib/expediente/digesto-fields'
import { formatNomenclaturaCatastralInput } from '@/lib/format'
import { OBJETO_EXPEDIENTE_OPTIONS } from '@/lib/expediente/catalogs'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  ExpedienteOrdenantesPanel,
  OrdenanteFormDialog,
  emptyDraft,
  isDraftValid,
  editActionClass,
  removeActionClass,
  addButtonClass,
  type OrdenanteDraft,
} from '@/components/app/expedientes/expediente-ordenantes-panel'
import { ExpedienteActuantesEditor } from '@/components/app/expedientes/expediente-actuantes-editor'
import type { ActuanteProfessionalRow } from '@/lib/professional/actuante-row'
import {
  ExpedienteFormSection,
  FormSubsectionTitle,
} from '@/components/app/expedientes/expediente-form-section'
import { useExpedienteStore, type PropietarioDirecto } from '@/stores/expediente-store'

export type ExpedienteDatosSnapshot = {
  id: string
  actuantesProfessionalIds: string[]
  objetoExpedienteId: string
  nomenclaturaCatastral: string
  planoAntecedente: string | null
  loteFraccion: string | null
  domicilioParcela: string | null
  parcial: boolean
  soloOrdenTrabajo: boolean
  fechaOrdenTrabajo: string | null
  propietario: string
  domicilioPropietario: string | null
  inscripcionDominio: string | null
  naturalezaActo: string | null
  memoriaObservaciones: string | null
  motivoHidraulica: string | null
  motivoFiscalia: string | null
  municipio: string | null
  requiereVisacionMunicipal: boolean
}

export type ProfessionalForForm = ActuanteProfessionalRow

export function ExpedienteDatosGeneralesForm({
  professionals,
  fieldErrors,
  dismissedFieldErrors,
  onDismissFieldError,
  ordenantesSlot,
}: {
  professionals: ProfessionalForForm[]
  fieldErrors?: Record<string, string[]>
  /** Claves de error ya corregidas por el usuario (controlado desde el padre). */
  dismissedFieldErrors?: Set<string>
  onDismissFieldError?: (key: string) => void
  ordenantesSlot?: React.ReactNode
}) {
  const [localDismissed, setLocalDismissed] = useState<Set<string>>(() => new Set())
  const fieldErrorsFingerprint = useMemo(
    () => (fieldErrors ? JSON.stringify(fieldErrors) : ''),
    [fieldErrors]
  )
  const prevFingerprintRef = useRef(fieldErrorsFingerprint)

  useEffect(() => {
    // Reset local dismissed set when field errors change
    if (fieldErrorsFingerprint !== prevFingerprintRef.current) {
      prevFingerprintRef.current = fieldErrorsFingerprint
      setLocalDismissed(new Set())
    }
  }, [fieldErrorsFingerprint, prevFingerprintRef])

  const dismissed = dismissedFieldErrors ?? localDismissed

  const dismissFieldError = useCallback(
    (key: string) => {
      onDismissFieldError?.(key)
      if (!onDismissFieldError) {
        setLocalDismissed((prev) => {
          if (prev.has(key)) return prev
          const next = new Set(prev)
          next.add(key)
          return next
        })
      }
    },
    [onDismissFieldError]
  )

  const fe = useCallback(
    (key: string) => {
      if (dismissed.has(key)) return undefined
      return fieldErrors?.[key]?.[0]
    },
    [dismissed, fieldErrors]
  )

  const datos = useExpedienteStore((s) => s.datos)
  const setDatos = useExpedienteStore((s) => s.setDatos)
  const ordenantes = useExpedienteStore((s) => s.ordenantes)
  const propietariosDirectos = useExpedienteStore((s) => s.propietariosDirectos)
  const setPropietariosDirectos = useExpedienteStore((s) => s.setPropietariosDirectos)

  // ─── propietarios from ordenantes (read-only) ────────────────────────────────
  const propietariosDeOrdenantes = useMemo(
    () => ordenantes.filter((o) => o.esPropietario),
    [ordenantes]
  )

  /** Propietarios agregados solo desde esta sección (no duplicar ordenantes marcados como propietario). */
  const propietariosDirectosSolo = useMemo(() => {
    const ordenanteOwnerKeys = new Set(propietariosDeOrdenantes.map((o) => o._key))
    return propietariosDirectos.filter((p) => !ordenanteOwnerKeys.has(p._key))
  }, [propietariosDirectos, propietariosDeOrdenantes])

  // Limpia duplicados legacy (antes se copiaban ordenantes a propietariosDirectos).
  useEffect(() => {
    if (propietariosDirectosSolo.length === propietariosDirectos.length) return
    setPropietariosDirectos(propietariosDirectosSolo)
  }, [propietariosDirectos, propietariosDirectosSolo, setPropietariosDirectos])

  // Sync datos.propietario / datos.domicilioPropietario from BOTH sources
  useEffect(() => {
    const nombres = [
      ...propietariosDeOrdenantes.map((p) => p.nombre),
      ...propietariosDirectosSolo.map((p) => p.nombre),
    ]
    const domicilios = [
      ...propietariosDeOrdenantes.map((p) => p.domicilio),
      ...propietariosDirectosSolo.map((p) => p.domicilio),
    ]
    if (nombres.length === 0) return
    setDatos({
      propietario: nombres.join(' y '),
      domicilioPropietario: domicilios.join('; '),
    })
  }, [propietariosDeOrdenantes, propietariosDirectosSolo, setDatos])

  // ─── propietario dialog state ───────────────────────────────────────────────
  const [propDialogOpen, setPropDialogOpen] = useState(false)
  const [propEditingKey, setPropEditingKey] = useState<string | null>(null)
  const [propDraft, setPropDraft] = useState<OrdenanteDraft>(emptyDraft)

  const openAddPropietario = () => {
    setPropEditingKey(null)
    setPropDraft({ ...emptyDraft(), esPropietario: true })
    setPropDialogOpen(true)
  }

  const openEditPropietario = (row: PropietarioDirecto) => {
    setPropEditingKey(row._key)
    setPropDraft({ ...emptyDraft(), nombre: row.nombre, domicilio: row.domicilio, esPropietario: true })
    setPropDialogOpen(true)
  }

  const removePropietario = (key: string) => {
    setPropietariosDirectos(propietariosDirectosSolo.filter((r) => r._key !== key))
  }

  const handleSavePropietario = () => {
    if (!isDraftValid(propDraft, true)) return

    const payload: PropietarioDirecto = {
      _key: propEditingKey ?? `prop-${propietariosDirectosSolo.length}`,
      nombre: propDraft.nombre.trim(),
      domicilio: propDraft.domicilio.trim(),
    }

    if (propEditingKey) {
      setPropietariosDirectos(
        propietariosDirectosSolo.map((r) => (r._key === propEditingKey ? payload : r))
      )
    } else {
      setPropietariosDirectos([...propietariosDirectosSolo, payload])
    }

    setPropDialogOpen(false)
    setPropEditingKey(null)
    setPropDraft(emptyDraft())
  }

  const [studioProfessionals, setStudioProfessionals] =
    useState<ActuanteProfessionalRow[]>(professionals)
  const prevProfessionalsRef = useRef(professionals)

  useEffect(() => {
    // Sync studioProfessionals when professionals prop changes
    if (professionals !== prevProfessionalsRef.current) {
      prevProfessionalsRef.current = professionals
      setStudioProfessionals(professionals)
    }
  }, [professionals, prevProfessionalsRef])

  const handleProfessionalCreated = (row: ActuanteProfessionalRow) => {
    setStudioProfessionals((prev) => {
      if (prev.some((p) => p.id === row.id)) {
        return prev.map((p) => (p.id === row.id ? row : p))
      }
      return [...prev, row].sort((a, b) => a.displayName.localeCompare(b.displayName, 'es'))
    })
  }

  const activeProfessionals = useMemo(
    () => studioProfessionals.filter((p) => p.active),
    [studioProfessionals]
  )
  const allowedIds = useMemo(
    () => new Set(activeProfessionals.map((p) => p.id)),
    [activeProfessionals]
  )

  const actuantesSelRef = useRef(datos.actuantesIds)
  useLayoutEffect(() => {
    actuantesSelRef.current = datos.actuantesIds
  })

  useEffect(() => {
    if (activeProfessionals.length === 0) return
    const prev = actuantesSelRef.current
    const filtered = prev.filter((id) => allowedIds.has(id))
    if (filtered.length !== prev.length || filtered.some((id, i) => id !== prev[i])) {
      setDatos({ actuantesIds: filtered })
    }
  }, [activeProfessionals, allowedIds, setDatos])

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <ExpedienteFormSection
        featured
        icon={Users}
        title="Profesionales actuantes"
        description="Definí quién firma y actúa en nombre del estudio en este expediente."
      >
        <div className="space-y-3">
          <ExpedienteActuantesEditor
            professionals={studioProfessionals}
            actuantesIds={datos.actuantesIds}
            onChange={(ids) => {
              dismissFieldError('actuantesIds')
              setDatos({ actuantesIds: ids })
            }}
            onProfessionalCreated={handleProfessionalCreated}
            fieldError={fe('actuantesIds')}
          />
        </div>
      </ExpedienteFormSection>

      <ExpedienteFormSection
        featured
        icon={ClipboardList}
        title="Ordenantes"
        description="Quienes encargan el trabajo y figuran en la documentación como parte solicitante."
      >
        <div className="space-y-3">
          {ordenantesSlot !== undefined ? ordenantesSlot : <ExpedienteOrdenantesPanel />}
        </div>
      </ExpedienteFormSection>

      <ExpedienteFormSection
        featured
        icon={UserRound}
        title="Propietarios / titulares registrales"
        description="Titulares dominiales que figuran en memoria y escrituras. Agregalos acá o marcá «Es propietario» en el diálogo de ordenantes."
      >
        <div className="flex flex-col gap-4">
          {propietariosDeOrdenantes.length === 0 && propietariosDirectosSolo.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">No hay propietarios cargados.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {/* Propietarios de ordenantes (read-only) */}
              {propietariosDeOrdenantes.map((row) => (
                <li key={row._key}>
                  <Card
                    size="sm"
                    className="gap-0 bg-[var(--color-muted-bg)]/20 py-0 shadow-[var(--shadow-soft)] ring-[var(--color-border)]"
                  >
                    <CardHeader className="shrink-0 border-b border-[var(--color-border)] pb-3">
                      <CardTitle className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 pr-2 text-[var(--color-heading)]">
                        {row.nombre.trim() || 'Sin nombre'}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex cursor-default items-center">
                              <UserRound className="h-4 w-4 text-[var(--accent-bright)]" aria-hidden />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>Es ordenante</TooltipContent>
                        </Tooltip>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="min-h-0 overflow-y-auto py-3">
                      <span className="inline-flex items-center gap-1 rounded-md bg-[var(--accent)] px-2 py-0.5 text-xs font-medium text-[var(--accent-bright)]">
                        Propietario
                      </span>
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
              {/* Propietarios directos (editables) */}
              {propietariosDirectosSolo.map((row) => (
                <li key={row._key}>
                  <Card
                    size="sm"
                    className="gap-0 bg-[var(--color-muted-bg)]/20 py-0 shadow-[var(--shadow-soft)] ring-[var(--color-border)]"
                  >
                    <CardHeader className="shrink-0 border-b border-[var(--color-border)] pb-3">
                      <CardTitle className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 pr-2 text-[var(--color-heading)]">
                        {row.nombre.trim() || 'Sin nombre'}
                      </CardTitle>
                      <CardAction>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className={editActionClass}
                            onClick={() => openEditPropietario(row)}
                            aria-label={`Editar a ${row.nombre.trim() || 'propietario'}`}
                          >
                            <Pencil className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                          </button>
                          <button
                            type="button"
                            className={removeActionClass}
                            onClick={() => removePropietario(row._key)}
                            aria-label={`Quitar a ${row.nombre.trim() || 'propietario'}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                          </button>
                        </div>
                      </CardAction>
                    </CardHeader>
                    <CardContent className="min-h-0 overflow-y-auto py-3">
                      <span className="inline-flex items-center gap-1 rounded-md bg-[var(--accent)] px-2 py-0.5 text-xs font-medium text-[var(--accent-bright)]">
                        Propietario
                      </span>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-muted)]">
                        <span className="inline-flex items-center gap-1">
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
            <button type="button" onClick={openAddPropietario} className={addButtonClass}>
              <Plus
                className="h-3.5 w-3.5 shrink-0 text-[var(--accent-bright)]"
                strokeWidth={2}
                aria-hidden
              />
              Agregar propietario
            </button>
          </div>

          <OrdenanteFormDialog
            open={propDialogOpen}
            onOpenChange={setPropDialogOpen}
            mode={propEditingKey ? 'edit' : 'add'}
            draft={propDraft}
            onDraftChange={setPropDraft}
            onSave={handleSavePropietario}
            lockedPropietario
            entityLabel="propietario"
          />

          <div className="flex flex-col gap-4">
            <FormSubsectionTitle>Registro dominial</FormSubsectionTitle>
            <p className="-mt-1 text-sm text-[var(--color-muted)]">
              Inscripción y naturaleza del acto según constan en el Registro General Inmobiliario.
            </p>
            <div className="flex flex-wrap items-start gap-4">
              <Field className="min-w-[10rem] flex-1">
                <FieldLabel>Inscripción de dominio</FieldLabel>
                <Input
                  value={datos.inscripcionDominio}
                  onChange={(e) => setDatos({ inscripcionDominio: e.target.value })}
                />
              </Field>
              <Field className="min-w-[10rem] flex-1">
                <FieldLabel>Naturaleza del acto</FieldLabel>
                <Input
                  value={datos.naturalezaActo}
                  onChange={(e) => setDatos({ naturalezaActo: e.target.value })}
                />
              </Field>
            </div>
          </div>
        </div>
      </ExpedienteFormSection>

      <ExpedienteFormSection
        featured
        icon={MapPinned}
        title="Ubicación y datos del inmueble"
        description="Objeto registral, nomenclatura catastral y domicilio de la parcela."
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-4">
            <Field className="min-w-[12rem] flex-1">
              <FieldLabel>
                Objeto del expediente
                <span className="text-[var(--accent-bright)]"> *</span>
              </FieldLabel>
              <Select
                value={datos.objetoExpedienteId}
                onValueChange={(v) => {
                  dismissFieldError('objetoExpedienteId')
                  setDatos({ objetoExpedienteId: v })
                }}
              >
                <SelectTrigger className="min-h-10 !h-10 w-full rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" className="min-w-(--radix-select-trigger-width)">
                  {OBJETO_EXPEDIENTE_OPTIONS.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fe('objetoExpedienteId') && <FieldError>{fe('objetoExpedienteId')}</FieldError>}
            </Field>

            <Field className="min-w-[10rem] flex-1 sm:max-w-xs">
              <FieldLabel>
                Nomenclatura catastral
                <span className="text-[var(--accent-bright)]"> *</span>
              </FieldLabel>
              <Input
                type="text"
                inputMode="numeric"
                maxLength={NOMENCLATURA_CATASTRAL.maxLength}
                className="font-mono"
                aria-describedby="exp-nom-help"
                value={datos.nomenclaturaCatastral}
                onChange={(e) => {
                  dismissFieldError('nomenclaturaCatastral')
                  const formatted = formatNomenclaturaCatastralInput(e.target.value)
                  setDatos({ nomenclaturaCatastral: formatted })
                }}
              />
              {fe('nomenclaturaCatastral') && (
                <FieldError>{fe('nomenclaturaCatastral')}</FieldError>
              )}
            </Field>

            <div className="flex shrink-0 flex-col gap-2">
              <span
                className="block text-sm leading-none font-medium text-transparent select-none"
                aria-hidden="true"
              >
                label
              </span>
              <label className="flex h-11 w-max max-w-full cursor-pointer items-center gap-3 rounded-xl border border-[var(--color-border)]/80 bg-[var(--color-muted-bg)]/20 px-3 sm:px-4">
                <input
                  type="checkbox"
                  checked={datos.parcial}
                  onChange={(e) => setDatos({ parcial: e.target.checked })}
                  className="h-4 w-4 shrink-0 accent-[var(--accent-bright)]"
                />
                <span className="text-sm leading-snug whitespace-nowrap text-[var(--color-heading)]">
                  Parcial
                </span>
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <FormSubsectionTitle>Antecedentes de mensura</FormSubsectionTitle>
            <div className="flex flex-wrap items-start gap-4">
              <Field className="min-w-[10rem] flex-1">
                <FieldLabel>Plano de antecedentes</FieldLabel>
                <Input
                  value={datos.planoAntecedente}
                  onChange={(e) => setDatos({ planoAntecedente: e.target.value })}
                />
              </Field>
              <Field className="min-w-[8rem] flex-1 sm:max-w-[10rem]">
                <FieldLabel>Lote / fracción</FieldLabel>
                <Input
                  value={datos.loteFraccion}
                  onChange={(e) => setDatos({ loteFraccion: e.target.value })}
                />
              </Field>
              <Field className="min-w-[12rem] flex-[2]">
                <FieldLabel>Domicilio de la parcela</FieldLabel>
                <Input
                  value={datos.domicilioParcela}
                  onChange={(e) => setDatos({ domicilioParcela: e.target.value })}
                />
              </Field>
            </div>
          </div>
        </div>
      </ExpedienteFormSection>

      <ExpedienteFormSection
        featured
        icon={FileText}
        title="Memoria descriptiva"
        description="Observaciones que se incluyen en la memoria y documentos derivados."
      >
        <Textarea
          rows={5}
          className="min-h-[140px] rounded-xl border-[var(--color-border)] text-[var(--color-heading)] focus-visible:ring-[var(--accent-bright)]"
          value={datos.memoriaObservaciones}
          onChange={(e) => setDatos({ memoriaObservaciones: e.target.value })}
        />
      </ExpedienteFormSection>

      <ExpedienteFormSection
        featured
        icon={Gavel}
        title="Motivos de citación"
        description="Textos para notas a Dirección de Hidráulica y Fiscalía cuando correspondan."
      >
        <div className="flex flex-col gap-6">
          <div className="space-y-2">
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
              <Droplets className="h-3.5 w-3.5 text-[var(--accent-bright)]" aria-hidden />
              Hidráulica (DH)
            </span>
            <Textarea
              rows={4}
              className="min-h-[110px] rounded-xl border-[var(--color-border)] text-[var(--color-heading)] focus-visible:ring-[var(--accent-bright)]"
              value={datos.motivoHidraulica}
              onChange={(e) => setDatos({ motivoHidraulica: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
              <Scale className="h-3.5 w-3.5 text-[var(--accent-bright)]" aria-hidden />
              Fiscalía
            </span>
            <Textarea
              rows={4}
              className="min-h-[110px] rounded-xl border-[var(--color-border)] text-[var(--color-heading)] focus-visible:ring-[var(--accent-bright)]"
              value={datos.motivoFiscalia}
              onChange={(e) => setDatos({ motivoFiscalia: e.target.value })}
            />
          </div>
        </div>
      </ExpedienteFormSection>
    </div>
  )
}
