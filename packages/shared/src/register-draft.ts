/**
 * PLAN-40: borrador local (sessionStorage) antes de abrir el enlace de verificación en el mismo origen.
 */
export const REGISTER_DRAFT_STORAGE_KEY = 'ms:register:draft:v1' as const

/** Campos necesarios para POST /v1/auth/register tras verificar el enlace. */
export type RegisterDraftV1 = {
  v: 1
  email: string
  password: string
  firstName: string
  lastName: string
  companyName: string
  termsAccepted: boolean
  /** Hub exige ambos checkboxes; otras apps pueden omitir y se asume true al registrar. */
  privacyAccepted?: boolean
  workifyEnabled?: boolean
  posEnabled?: boolean
  technicalServicesEnabled?: boolean
}

export function parseRegisterDraftV1(raw: string | null): RegisterDraftV1 | null {
  if (raw == null || raw.trim() === '') return null
  try {
    const o = JSON.parse(raw) as unknown
    if (!o || typeof o !== 'object') return null
    const d = o as Partial<RegisterDraftV1>
    if (d.v !== 1) return null
    if (
      typeof d.email !== 'string' ||
      typeof d.password !== 'string' ||
      typeof d.firstName !== 'string' ||
      typeof d.lastName !== 'string' ||
      typeof d.companyName !== 'string' ||
      typeof d.termsAccepted !== 'boolean' ||
      !d.termsAccepted
    ) {
      return null
    }
    return {
      v: 1,
      email: d.email.trim().toLowerCase(),
      password: d.password,
      firstName: d.firstName.trim(),
      lastName: d.lastName.trim(),
      companyName: d.companyName.trim(),
      termsAccepted: true,
      privacyAccepted: d.privacyAccepted,
      workifyEnabled: d.workifyEnabled,
      posEnabled: d.posEnabled,
      technicalServicesEnabled: d.technicalServicesEnabled,
    }
  } catch {
    return null
  }
}
