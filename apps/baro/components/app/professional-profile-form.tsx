'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { ORDENANTE_SEXO_LABEL_SET, ORDENANTE_SEXO_OPTIONS } from '@/lib/expediente/catalogs'
import { useAccount } from '@/components/app/account-context'
import {
  CONTACTO_PROFESIONAL_CHECKLIST,
  PLAN_MEMBRETE_CHECKLIST,
  PROFILE_LEGAL_DISCLAIMER,
  PROFESSIONAL_LEGAL_REFERENCES,
} from '@/lib/professional/legal'
import { derivarCuit } from '@/lib/format'
import { sanitizeDniInput } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ProfessionalTitleChoice = 'AGRIMENSOR' | 'INGENIERO_AGRIMENSOR'

export type TitleGrammarChoice = 'MASCULINO' | 'FEMENINO'

export type ApiRegistration = {
  id: string
  professionalId?: string
  profileId?: string
  licenseNumber: string
  jurisdiction: string
  bodyName: string | null
}

export type ApiProfessionalListItem = {
  id: string
  displayName: string
  /** Título habilitante del profesional (único por persona). */
  professionalTitle: ProfessionalTitleChoice
  titleGrammarGender: TitleGrammarChoice
  locality: string
  addressLine1: string
  createdAt: string
  updatedAt: string
  /** Si está inactivo, no aparece en select de expedientes */
  active?: boolean
  primaryMatricula?: string | null
  primaryJurisdiction?: string | null
  /** Matrículas del profesional */
  registrations?: ApiRegistration[]
}

export type ApiProfile = {
  id: string
  userId: string
  displayName: string
  dni: string
  sexo: string
  professionalTitle: ProfessionalTitleChoice
  titleGrammarGender: TitleGrammarChoice
  phone: string | null
  whatsapp: string | null
  professionalEmail: string | null
  addressLine1: string
  addressLine2: string | null
  locality: string
  province: string
  postalCode: string | null
  websiteUrl: string | null
  cuit: string | null
  registrations: ApiRegistration[]
  createdAt?: string
  updatedAt?: string
}

type RegistrationRow = {
  licenseNumber: string
  jurisdiction: string
  bodyName: string
}

const emptyRegistration = (): RegistrationRow => ({
  licenseNumber: '',
  jurisdiction: 'San Juan',
  bodyName: '',
})

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-4">
      <h3 className="border-b border-[var(--color-border)] pb-2 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
        {title}
      </h3>
      {children}
    </div>
  )
}

export type ProfessionalProfileFormProps = {
  variant?: 'titular' | 'collaborator'
  /** Si `variant` es colaborador: `null` = alta; id = edición. */
  collaboratorId?: string | null
  onCollaboratorSaved?: (professional: ApiProfile) => void
  /** Modal / panel embebido: menos chrome. */
  embedded?: boolean
  /** `external`: el padre provee acciones fijas (p. ej. DialogFooter). */
  embeddedActions?: 'inline' | 'external'
  formId?: string
  onCancel?: () => void
}

export function ProfessionalProfileForm({
  variant = 'titular',
  collaboratorId = null,
  onCollaboratorSaved,
  embedded = false,
  embeddedActions = 'inline',
  formId,
  onCancel,
}: ProfessionalProfileFormProps = {}) {
  const { refresh: refreshAccount } = useAccount()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [issues, setIssues] = useState<{ path: (string | number)[]; message: string }[]>([])
  const [displayName, setDisplayName] = useState('')
  const [dni, setDni] = useState('')
  const [sexo, setSexo] = useState('')
  const [phone, setPhone] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [professionalEmail, setProfessionalEmail] = useState('')
  const [addressLine1, setAddressLine1] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [locality, setLocality] = useState('')
  const [province, setProvince] = useState('San Juan')
  const [postalCode, setPostalCode] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [cuit, setCuit] = useState('')
  const [professionalTitle, setProfessionalTitle] = useState<ProfessionalTitleChoice>('AGRIMENSOR')
  const [rows, setRows] = useState<RegistrationRow[]>([emptyRegistration()])

  const autoDeriveCuit = (dniValue: string, sexoValue: string) => {
    if (sexoValue === 'X') {
      setCuit('')
      return
    }
    const derivado = derivarCuit(dniValue, sexoValue)
    if (derivado) setCuit(derivado)
  }

  const handleSexoChange = (value: string) => {
    setSexo(value)
    autoDeriveCuit(dni, value)
  }
  const resetEmptyCollaborator = useCallback(() => {
    setDisplayName('')
    setDni('')
    setSexo('')
    setPhone('')
    setWhatsapp('')
    setProfessionalEmail('')
    setAddressLine1('')
    setAddressLine2('')
    setLocality('')
    setProvince('San Juan')
    setPostalCode('')
    setWebsiteUrl('')
    setCuit('')
    setProfessionalTitle('AGRIMENSOR')
    setRows([emptyRegistration()])
  }, [])

  const hydrateFromProfile = useCallback((p: ApiProfile) => {
    setDisplayName(p.displayName)
    setDni(p.dni ?? '')
    setSexo(p.sexo ?? '')
    setPhone(p.phone ?? '')
    setWhatsapp(p.whatsapp ?? '')
    setProfessionalEmail(p.professionalEmail ?? '')
    setAddressLine1(p.addressLine1)
    setAddressLine2(p.addressLine2 ?? '')
    setLocality(p.locality)
    setProvince(p.province)
    setPostalCode(p.postalCode ?? '')
    setWebsiteUrl(p.websiteUrl ?? '')
    setCuit(p.cuit ?? '')
    setProfessionalTitle(p.professionalTitle ?? 'AGRIMENSOR')
    setRows(
      p.registrations.length > 0
        ? p.registrations.map((r) => ({
            licenseNumber: r.licenseNumber,
            jurisdiction: r.jurisdiction,
            bodyName: r.bodyName ?? '',
          }))
        : [emptyRegistration()]
    )
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        if (variant === 'titular') {
          const res = await fetch('/api/auth/profile', { credentials: 'include' })
          const data = (await res.json().catch(() => ({}))) as {
            profile?: ApiProfile | null
            message?: string
          }
          if (!res.ok) {
            if (!cancelled) setError(data.message ?? 'No se pudo cargar el perfil.')
            return
          }
          if (data.profile) {
            hydrateFromProfile(data.profile)
          }
        } else {
          if (collaboratorId) {
            const res = await fetch(`/api/auth/associated-professionals/${collaboratorId}`, {
              credentials: 'include',
            })
            const data = (await res.json().catch(() => ({}))) as {
              professional?: ApiProfile
              message?: string
            }
            if (!res.ok) {
              if (!cancelled) setError(data.message ?? 'No se pudo cargar el colaborador.')
              return
            }
            if (data.professional) {
              hydrateFromProfile(data.professional)
            }
          } else {
            resetEmptyCollaborator()
          }
        }
      } catch {
        if (!cancelled)
          setError(
            variant === 'titular'
              ? 'No se pudo cargar el perfil.'
              : 'No se pudo cargar el colaborador.'
          )
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [variant, collaboratorId, hydrateFromProfile, resetEmptyCollaborator])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setIssues([])
    const payload = {
      displayName,
      dni,
      sexo,
      phone: phone || null,
      whatsapp: whatsapp || null,
      professionalEmail: professionalEmail || null,
      addressLine1,
      addressLine2: addressLine2 || null,
      locality,
      province,
      postalCode: postalCode || null,
      websiteUrl: websiteUrl || null,
      cuit: cuit || null,
      professionalTitle,
      registrations: rows.map((r) => ({
        licenseNumber: r.licenseNumber.trim(),
        jurisdiction: r.jurisdiction.trim(),
        bodyName: r.bodyName.trim() || null,
      })),
    }
    try {
      if (variant === 'titular') {
        const res = await fetch('/api/auth/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        })
        const data = (await res.json().catch(() => ({}))) as {
          issues?: { path: (string | number)[]; message: string }[]
          message?: string
          profile?: ApiProfile
        }
        if (!res.ok) {
          if (data.issues?.length) {
            setIssues(data.issues)
            setError(null)
          } else {
            setIssues([])
            setError(data.message ?? 'No se pudo guardar.')
          }
          return
        }
        if (data.profile) hydrateFromProfile(data.profile)
        void refreshAccount({ silent: true })
      } else {
        const url = collaboratorId
          ? `/api/auth/associated-professionals/${collaboratorId}`
          : '/api/auth/associated-professionals'
        const method = collaboratorId ? 'PATCH' : 'POST'
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        })
        const data = (await res.json().catch(() => ({}))) as {
          issues?: { path: (string | number)[]; message: string }[]
          message?: string
          professional?: ApiProfile
        }
        if (!res.ok) {
          if (data.issues?.length) {
            setIssues(data.issues)
            setError(null)
          } else {
            setIssues([])
            setError(data.message ?? 'No se pudo guardar.')
          }
          return
        }
        if (data.professional) {
          hydrateFromProfile(data.professional)
          onCollaboratorSaved?.(data.professional)
        }
        void refreshAccount({ silent: true })
      }
    } finally {
      setSaving(false)
    }
  }

  function updateRow(i: number, patch: Partial<RegistrationRow>) {
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRegistration()])
  }

  function removeRow(i: number) {
    setRows((prev) => prev.filter((_, j) => j !== i))
  }

  if (loading) {
    return (
      <div className="space-y-4" role="status" aria-busy="true">
        <div className="h-7 w-48 animate-pulse rounded-md bg-[var(--color-border)]/80" />
        <div className="h-40 animate-pulse rounded-2xl bg-[var(--color-border)]/50" />
      </div>
    )
  }

  const isCollaborator = variant === 'collaborator'

  return (
    <div
      className={cn(
        embedded
          ? 'flex w-full flex-col gap-6'
          : 'flex h-full w-full flex-1 flex-col gap-6 overflow-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-6'
      )}
    >
      <form id={formId} onSubmit={onSubmit} className="flex w-full flex-col gap-8">
        <FormSection title="Identificación">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-1.5 text-sm sm:col-span-2">
              <Label htmlFor="prof-displayName">Apellido y nombre</Label>
              <Input
                id="prof-displayName"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="min-h-10 rounded-xl"
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1.5 text-sm">
              <Label htmlFor="prof-professionalTitle">Título profesional</Label>
              <Select
                value={professionalTitle}
                onValueChange={(v) => setProfessionalTitle(v as ProfessionalTitleChoice)}
              >
                <SelectTrigger className="min-h-10 !h-10 w-full rounded-xl">
                  <SelectValue placeholder="Seleccionar…" />
                </SelectTrigger>
                <SelectContent position="popper" className="min-w-(--radix-select-trigger-width)">
                  <SelectItem value="AGRIMENSOR">Agrimensor</SelectItem>
                  <SelectItem value="INGENIERO_AGRIMENSOR">Ingeniero Agrimensor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex min-w-0 flex-col gap-1.5 text-sm">
              <Label htmlFor="prof-dni">DNI</Label>
              <Input
                id="prof-dni"
                required
                inputMode="numeric"
                autoComplete="off"
                value={dni}
                onChange={(e) => {
                  const v = sanitizeDniInput(e.target.value)
                  setDni(v)
                  autoDeriveCuit(v, sexo)
                }}
                className="min-h-10 rounded-xl"
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1.5 text-sm">
              <Label htmlFor="prof-sexo">Sexo</Label>
              <Select
                value={sexo === '' ? undefined : sexo}
                onValueChange={handleSexoChange}
                required
              >
                <SelectTrigger className="min-h-10 !h-10 w-full rounded-xl">
                  <SelectValue placeholder="Seleccioná el sexo" />
                </SelectTrigger>
                <SelectContent position="popper" className="min-w-(--radix-select-trigger-width)">
                  {sexo && !ORDENANTE_SEXO_LABEL_SET.has(sexo) ? (
                    <SelectItem value={sexo}>{sexo}</SelectItem>
                  ) : null}
                  {ORDENANTE_SEXO_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex min-w-0 flex-col gap-1.5 text-sm">
              <Label htmlFor="prof-cuit">CUIT</Label>
              <Input
                id="prof-cuit"
                required
                value={cuit}
                onChange={(e) => setCuit(e.target.value)}
                placeholder="XX-XXXXXXXX-X"
                autoComplete="off"
                className="min-h-10 rounded-xl"
              />
            </div>
          </div>
        </FormSection>

        <FormSection title="Matrículas">
          <div className="space-y-2">
            {rows.map((row, i) => (
              <div
                key={i}
                className={`grid ${rows.length > 1 ? 'grid-cols-[1fr_1fr_1fr_auto]' : 'grid-cols-[1fr_1fr_1fr]'} gap-2`}
              >
                <Input
                  id={`prof-licenseNumber-${i}`}
                  required
                  placeholder="Nº matrícula"
                  value={row.licenseNumber}
                  onChange={(e) => updateRow(i, { licenseNumber: e.target.value })}
                  className="min-h-10 rounded-xl"
                />
                <Input
                  id={`prof-jurisdiction-${i}`}
                  required
                  placeholder="Jurisdicción"
                  value={row.jurisdiction}
                  onChange={(e) => updateRow(i, { jurisdiction: e.target.value })}
                  className="min-h-10 rounded-xl"
                />
                <Input
                  id={`prof-bodyName-${i}`}
                  placeholder="Organismo (opcional)"
                  value={row.bodyName}
                  onChange={(e) => updateRow(i, { bodyName: e.target.value })}
                  className="min-h-10 rounded-xl"
                />
                {rows.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    className="inline-flex min-h-10 w-10 shrink-0 cursor-pointer items-center justify-center self-center rounded-md border border-red-500/30 text-red-600 transition-colors hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-bright)]"
                    aria-label="Quitar matrícula"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                  </button>
                ) : null}
              </div>
            ))}
            <button
              type="button"
              className="text-xs font-medium text-[var(--accent-bright)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-bright)]/30 rounded"
              onClick={addRow}
            >
              + Agregar otra matrícula
            </button>
          </div>
        </FormSection>

        <FormSection title="Contacto">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-1.5 text-sm">
              <Label htmlFor="prof-phone">Teléfono</Label>
              <Input
                id="prof-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="min-h-10 rounded-xl"
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1.5 text-sm">
              <Label htmlFor="prof-whatsapp">WhatsApp</Label>
              <Input
                id="prof-whatsapp"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="min-h-10 rounded-xl"
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1.5 text-sm sm:col-span-2">
              <Label htmlFor="prof-email">Email de contacto profesional</Label>
              <Input
                id="prof-email"
                type="email"
                value={professionalEmail}
                onChange={(e) => setProfessionalEmail(e.target.value)}
                className="min-h-10 rounded-xl"
              />
            </div>
          </div>
        </FormSection>

        <FormSection title="Domicilio profesional">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex min-w-0 flex-col gap-1.5 text-sm sm:col-span-2 lg:col-span-3">
              <Label htmlFor="prof-addr1">Calle y número</Label>
              <Input
                id="prof-addr1"
                required
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                className="min-h-10 rounded-xl"
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1.5 text-sm sm:col-span-2 lg:col-span-3">
              <Label htmlFor="prof-addr2">Piso / depto / referencia (opcional)</Label>
              <Input
                id="prof-addr2"
                value={addressLine2}
                onChange={(e) => setAddressLine2(e.target.value)}
                className="min-h-10 rounded-xl"
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1.5 text-sm">
              <Label htmlFor="prof-locality">Localidad</Label>
              <Input
                id="prof-locality"
                required
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                className="min-h-10 rounded-xl"
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1.5 text-sm">
              <Label htmlFor="prof-province">Provincia</Label>
              <Input
                id="prof-province"
                required
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="min-h-10 rounded-xl"
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1.5 text-sm">
              <Label htmlFor="prof-postalCode">Código postal</Label>
              <Input
                id="prof-postalCode"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="min-h-10 rounded-xl"
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1.5 text-sm sm:col-span-2 lg:col-span-3">
              <Label htmlFor="prof-websiteUrl">Sitio web</Label>
              <Input
                id="prof-websiteUrl"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://…"
                className="min-h-10 rounded-xl"
              />
            </div>
          </div>
        </FormSection>

        {issues.length > 0 ? (
          <ul className="list-inside list-disc text-sm text-red-600 dark:text-red-400" role="alert">
            {issues.map((issue, idx) => (
              <li key={idx}>{issue.message}</li>
            ))}
          </ul>
        ) : null}
        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : null}

        {embedded && isCollaborator && embeddedActions === 'inline' ? (
          <div className="flex flex-col-reverse gap-2 border-t border-[var(--color-border)] pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar y agregar'}
            </Button>
          </div>
        ) : null}
      </form>
      {!isCollaborator && !embedded ? (
        <details className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-muted-bg)]/25 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3.5 text-left text-sm font-medium text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-muted-bg)]/50">
            <span>Referencias legales y checklist para planos</span>
            <span
              className="text-[var(--color-muted)] transition-transform group-open:rotate-180"
              aria-hidden
            >
              ▼
            </span>
          </summary>
          <div className="space-y-4 border-t border-[var(--color-border)] px-4 py-4 text-sm">
            <p className="leading-relaxed text-[var(--color-muted)]">{PROFILE_LEGAL_DISCLAIMER}</p>
            <p className="text-xs font-medium text-[var(--color-foreground)]">Enlaces útiles</p>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
              <a
                href={PROFESSIONAL_LEGAL_REFERENCES.colegioAgrimensoresSanJuan}
                className="text-[var(--color-foreground)] underline decoration-[var(--color-border)] underline-offset-4 transition-colors hover:decoration-[var(--color-accent)]"
                target="_blank"
                rel="noreferrer"
              >
                Colegio de Agrimensores — San Juan
              </a>
              <span className="text-[var(--color-border)]" aria-hidden>
                ·
              </span>
              <a
                href={PROFESSIONAL_LEGAL_REFERENCES.cpaNacional}
                className="text-[var(--color-foreground)] underline decoration-[var(--color-border)] underline-offset-4 transition-colors hover:decoration-[var(--color-accent)]"
                target="_blank"
                rel="noreferrer"
              >
                CPA (referencia nacional)
              </a>
            </div>
            <div className="grid gap-6 border-t border-[var(--color-border)] pt-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-[var(--color-muted)]">
                  Suele pedirse en plano / membrete
                </p>
                <ul className="mt-2 space-y-1.5 text-xs leading-snug text-[var(--color-foreground)]">
                  {PLAN_MEMBRETE_CHECKLIST.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="text-[var(--color-muted)]">·</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--color-muted)]">
                  Contacto y facturación
                </p>
                <ul className="mt-2 space-y-1.5 text-xs leading-snug text-[var(--color-foreground)]">
                  {CONTACTO_PROFESIONAL_CHECKLIST.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="text-[var(--color-muted)]">·</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </details>
      ) : null}
    </div>
  )
}
