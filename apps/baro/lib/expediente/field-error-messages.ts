import type { ZodIssue } from 'zod'

/** Etiquetas legibles para errores de validación en datos generales / alta. */
export const EXPEDIENTE_DATOS_FIELD_LABELS: Record<string, string> = {
  actuantesIds: 'Profesionales actuantes',
  objetoExpedienteId: 'Objeto del expediente',
  nomenclaturaCatastral: 'Nomenclatura catastral',
  propietario: 'Propietario / titular',
  domicilioPropietario: 'Domicilio del propietario',
  planoAntecedente: 'Plano de antecedentes',
  loteFraccion: 'Lote / fracción',
  domicilioParcela: 'Domicilio de la parcela',
  municipio: 'Municipio',
  fechaOrdenTrabajo: 'Fecha de la orden de trabajo',
  inscripcionDominio: 'Inscripción de dominio',
  naturalezaActo: 'Naturaleza del acto',
}

/** Mensajes de campo vacío / requerido (vs. formato o catálogo inválido). */
const REQUIRED_FIELD_MESSAGE =
  /obligator|seleccioná|selecciona|es requerid|no puede estar vacío|debe ingresar/i

/** Un solo mensaje por campo cuando Zod emite varios (p. ej. vacío + regex). */
export function pickPrimaryFieldError(messages: string[]): string | undefined {
  if (messages.length === 0) return undefined
  if (messages.length === 1) return messages[0]
  const required = messages.find((m) => REQUIRED_FIELD_MESSAGE.test(m))
  return required ?? messages[0]
}

export function normalizeExpedienteFieldErrors(
  raw: Record<string, string[]>
): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const [key, msgs] of Object.entries(raw)) {
    const primary = pickPrimaryFieldError(msgs)
    if (primary) out[key] = [primary]
  }
  return out
}

export function zodIssuesToExpedienteFieldErrors(issues: ZodIssue[]): Record<string, string[]> {
  const raw: Record<string, string[]> = {}
  for (const issue of issues) {
    const path = issue.path.join('.') || '_form'
    if (!raw[path]) raw[path] = []
    raw[path].push(issue.message)
  }
  return normalizeExpedienteFieldErrors(raw)
}

export function summarizeExpedienteFieldErrors(
  fieldErrors?: Record<string, string[]>
): string | null {
  if (!fieldErrors) return null
  const lines = Object.entries(fieldErrors).flatMap(([key, msgs]) => {
    const msg = pickPrimaryFieldError(msgs)
    if (!msg) return []
    const label = EXPEDIENTE_DATOS_FIELD_LABELS[key] ?? key
    return [`${label}: ${msg}`]
  })
  return lines.length > 0 ? lines.join(' · ') : null
}
