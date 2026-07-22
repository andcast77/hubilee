import { z } from 'zod'
import { UserRole } from '@/types'

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Password is required'),
})

export type LoginInput = z.infer<typeof loginSchema>

/** Unified code login: globally unique userCode + password (+ optional Turnstile). */
export const codeLoginSchema = z.object({
  userCode: z.string().trim().min(1, 'El código de usuario es requerido').max(32),
  password: z.string().min(1, 'Password is required'),
  captchaToken: z.string().min(1).optional(),
})

export type CodeLoginInput = z.infer<typeof codeLoginSchema>

/** @deprecated Use codeLoginSchema */
export const floorLoginSchema = codeLoginSchema
export type FloorLoginInput = CodeLoginInput

/** API requires Turnstile after failedLoginAttempts >= 1 — show after first UI failure. */
export function shouldShowCodeTurnstile(failedAttempts: number): boolean {
  return failedAttempts >= 1
}

/** @deprecated Use shouldShowCodeTurnstile */
export function shouldShowFloorTurnstile(failedAttempts: number): boolean {
  return shouldShowCodeTurnstile(failedAttempts)
}

export type MembershipRole = 'ADMIN' | 'USER'

/** Map POS UI roles to company membership — never send CASHIER/SUPERVISOR to API. */
export function mapUiRoleToMembershipRole(role: UserRole): MembershipRole {
  if (role === UserRole.ADMIN) return 'ADMIN'
  return 'USER'
}

export type CreateShopMemberFormInput = {
  name: string
  email?: string
  password: string
  role: UserRole
  active?: boolean
  storeIds?: string[]
}

/** @deprecated Use CreateShopMemberFormInput */
export type CreateFloorMemberFormInput = CreateShopMemberFormInput

export type CreateCompanyMemberPayload = {
  email?: string
  password: string
  firstName?: string
  lastName?: string
  membershipRole: MembershipRole
  storeIds?: string[]
}

function splitName(name: string): { firstName: string; lastName?: string } {
  const trimmed = name.trim()
  const space = trimmed.indexOf(' ')
  if (space === -1) return { firstName: trimmed }
  return {
    firstName: trimmed.slice(0, space),
    lastName: trimmed.slice(space + 1).trim() || undefined,
  }
}

/**
 * Build createCompanyMember body from UserForm values.
 * Cajero: omit email; membership USER. Admin: require email.
 */
export function buildCreateShopMemberPayload(
  form: CreateShopMemberFormInput,
): CreateCompanyMemberPayload {
  const membershipRole = mapUiRoleToMembershipRole(form.role)
  const { firstName, lastName } = splitName(form.name)
  const payload: CreateCompanyMemberPayload = {
    password: form.password,
    firstName,
    ...(lastName ? { lastName } : {}),
    membershipRole,
  }
  if (form.storeIds && form.storeIds.length > 0) {
    payload.storeIds = form.storeIds
  }
  const email = form.email?.trim()
  if (membershipRole === 'ADMIN' || email) {
    payload.email = email
  }
  return payload
}

/** @deprecated Use buildCreateShopMemberPayload */
export function buildCreateFloorMemberPayload(
  form: CreateShopMemberFormInput,
): CreateCompanyMemberPayload {
  return buildCreateShopMemberPayload(form)
}

export const registerSchema = z
  .object({
    firstName: z.string().min(1, 'El nombre es requerido'),
    lastName: z.string().min(1, 'El apellido es requerido'),
    companyName: z.string().min(1, 'El nombre de la empresa es requerido'),
    email: z.string().email('Email inválido'),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
    termsAccepted: z.boolean().refine((value) => value, {
      message: 'Debes aceptar los términos para continuar',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })

export type RegisterInput = z.infer<typeof registerSchema>
