import type { Professional, ProfessionalRegistration } from '@prisma/client'
import { z } from 'zod'
import { DNI_DIGITS_PATTERN } from '@/lib/format'
import { summarizeProfessionalTitles } from '@/lib/professional/registration-pick'

/** Campos que pueden mostrarse en membrete, tarjeta o vista pública. El CUIT, DNI y el id interno no deben exponerse así. */
export const PUBLIC_PROFILE_FIELD_KEYS = [
  'displayName',
  'phone',
  'whatsapp',
  'professionalEmail',
  'addressLine1',
  'addressLine2',
  'locality',
  'province',
  'postalCode',
  'websiteUrl',
  'registrations',
] as const

export type PublicRegistration = Pick<
  ProfessionalRegistration,
  'licenseNumber' | 'jurisdiction' | 'bodyName'
>

export type PublicProfessionalProfile = Pick<
  Professional,
  | 'displayName'
  | 'phone'
  | 'whatsapp'
  | 'professionalEmail'
  | 'addressLine1'
  | 'addressLine2'
  | 'locality'
  | 'province'
  | 'postalCode'
  | 'websiteUrl'
> & {
  registrations: PublicRegistration[]
}

export type FullProfessionalProfile = Professional & {
  registrations: ProfessionalRegistration[]
}

const optionalTrimmed = z.union([z.string(), z.null(), z.undefined()]).transform((v) => {
  if (v == null) return null
  const t = v.trim()
  return t.length === 0 ? null : t
})

const cuitArgRequired = z
  .string()
  .trim()
  .min(1, 'Ingresá el CUIT.')
  .refine((v) => /^\d{2}-\d{8}-\d$/.test(v), 'CUIT inválido. Usá el formato XX-XXXXXXXX-X.')

const optionalUrl = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => {
    if (v == null) return null
    const t = v.trim()
    return t.length === 0 ? null : t
  })
  .refine(
    (v) => v == null || /^https?:\/\//i.test(v),
    'La URL debe comenzar con http:// o https://.'
  )

export const professionalRegistrationInputSchema = z.object({
  licenseNumber: z.string().trim().min(1, 'Ingresá el número de matrícula.'),
  jurisdiction: z.string().trim().min(1, 'Ingresá la jurisdicción (provincia o distrito).'),
  bodyName: optionalTrimmed,
})

export const professionalProfileUpsertSchema = z.object({
  profesionalPrincipalId: optionalTrimmed,
  active: z.boolean().optional(),
  professionalTitle: z.enum(['AGRIMENSOR', 'INGENIERO_AGRIMENSOR']),
  displayName: z.string().trim().min(2, 'Ingresá apellido y nombre.').max(200),
  dni: z
    .string()
    .trim()
    .min(1, 'Ingresá el DNI.')
    .regex(DNI_DIGITS_PATTERN, 'El DNI solo puede incluir números (hasta 8 dígitos).'),
  sexo: z.string().trim().min(1, 'Seleccioná el sexo.'),
  phone: optionalTrimmed,
  whatsapp: optionalTrimmed,
  professionalEmail: optionalTrimmed.pipe(
    z.union([z.string().email('Email profesional inválido.'), z.null()])
  ),
  addressLine1: z.string().trim().min(1, 'Ingresá calle y número.').max(200),
  addressLine2: optionalTrimmed.pipe(z.union([z.string().max(200), z.null()])),
  locality: z.string().trim().min(1, 'Ingresá la localidad.').max(120),
  province: z.string().trim().min(1).max(120).default('San Juan'),
  postalCode: optionalTrimmed.pipe(z.union([z.string().max(20), z.null()])),
  websiteUrl: optionalUrl.pipe(z.union([z.string().url('URL inválida.'), z.null()])),
  cuit: cuitArgRequired,
  registrations: z
    .array(professionalRegistrationInputSchema)
    .min(1, 'Agregá al menos una matrícula en una jurisdicción.'),
})

// Schema simplificado para cambio de profesional principal (solo el ID)
export const setPrincipalSchema = z.object({
  profesionalPrincipalId: z.string().trim().min(1, 'Profesional inválido.'),
})

export type SetPrincipalInput = z.infer<typeof setPrincipalSchema>

export type ProfessionalProfileUpsertInput = z.infer<typeof professionalProfileUpsertSchema>

/** Respuesta API: incluye `professionalTitle` / `titleGrammarGender` para textos (título del profesional + sexo). */
export function professionalProfileApiShape<P extends FullProfessionalProfile>(p: P) {
  return { ...p, ...summarizeProfessionalTitles(p.professionalTitle, p.sexo) }
}

export function toPublicProfessionalProfile(
  profile: FullProfessionalProfile
): PublicProfessionalProfile {
  const { registrations, ...rest } = profile
  return {
    displayName: rest.displayName,
    phone: rest.phone,
    whatsapp: rest.whatsapp,
    professionalEmail: rest.professionalEmail,
    addressLine1: rest.addressLine1,
    addressLine2: rest.addressLine2,
    locality: rest.locality,
    province: rest.province,
    postalCode: rest.postalCode,
    websiteUrl: rest.websiteUrl,
    registrations: registrations.map((r) => ({
      licenseNumber: r.licenseNumber,
      jurisdiction: r.jurisdiction,
      bodyName: r.bodyName,
    })),
  }
}
