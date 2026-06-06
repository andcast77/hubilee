import {
  pickPrimaryFieldError,
  zodIssuesToExpedienteFieldErrors,
} from '@/lib/expediente/field-error-messages'
import { expedienteNuevaSchema } from '@/lib/expediente/schemas'
import type { ZodIssue } from 'zod'
import type { DatosFields } from '@/stores/expediente-store'

/** Mensaje breve bajo Guardar cuando falla la validación en cliente. */
export const CLIENT_VALIDATION_HEADER_MESSAGE = 'Completá los campos marcados como requeridos.'

export function buildExpedienteNuevaRaw(datos: DatosFields) {
  return {
    ...datos,
    soloOrdenTrabajo: Boolean(datos.fechaOrdenTrabajo?.trim()),
  }
}

/** Mensajes cortos bajo cada campo (solo validación en cliente). */
const CLIENT_FIELD_MESSAGES: Record<string, { required: string; invalid?: string }> = {
  objetoExpedienteId: {
    required: 'Seleccioná el objeto.',
    invalid: 'Seleccioná el objeto.',
  },
  nomenclaturaCatastral: {
    required: 'Completá la nomenclatura.',
    invalid: 'Formato inválido (ej. 01-05/001234).',
  },
  propietario: {
    required: 'Completá el propietario.',
  },
  actuantesIds: {
    required: 'Agregá al menos un actuante.',
  },
}

const REQUIRED_HINT = /obligator|seleccioná|selecciona|es requerid|es obligatoria/i

function toClientFieldMessage(key: string, zodMessage: string): string {
  const cfg = CLIENT_FIELD_MESSAGES[key]
  if (cfg && REQUIRED_HINT.test(zodMessage)) return cfg.required
  if (cfg?.invalid && key === 'nomenclaturaCatastral') return cfg.invalid
  if (cfg?.invalid && key === 'objetoExpedienteId') return cfg.invalid
  if (cfg?.required) return cfg.required
  return 'Revisá este campo.'
}

function zodIssuesToClientFieldErrors(issues: ZodIssue[]): Record<string, string[]> {
  const normalized = zodIssuesToExpedienteFieldErrors(issues)
  const out: Record<string, string[]> = {}
  for (const [key, msgs] of Object.entries(normalized)) {
    const primary = pickPrimaryFieldError(msgs)
    if (primary) out[key] = [toClientFieldMessage(key, primary)]
  }
  return out
}

export type ValidateExpedienteNuevaResult =
  | { ok: true; data: ReturnType<typeof expedienteNuevaSchema.parse> }
  | { ok: false; fieldErrors: Record<string, string[]> }

/** Validación en cliente al guardar; no llama al servidor si falla. */
export function validateExpedienteNuevaDatos(datos: DatosFields): ValidateExpedienteNuevaResult {
  const parsed = expedienteNuevaSchema.safeParse(buildExpedienteNuevaRaw(datos))
  if (parsed.success) {
    return { ok: true, data: parsed.data }
  }
  return { ok: false, fieldErrors: zodIssuesToClientFieldErrors(parsed.error.issues) }
}
