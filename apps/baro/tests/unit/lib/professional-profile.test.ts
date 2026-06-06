import { describe, expect, it } from 'vitest'
import {
  professionalProfileUpsertSchema,
  toPublicProfessionalProfile,
  type FullProfessionalProfile,
} from '@/lib/professional/profile'

const validBase = {
  professionalTitle: 'AGRIMENSOR' as const,
  displayName: 'Ana Pérez',
  dni: '30123456',
  sexo: 'Femenino',
  cuit: '27-30123456-4',
  addressLine1: 'San Luis 100 Oeste',
  locality: 'Capital',
  province: 'San Juan',
  registrations: [{ licenseNumber: '1234', jurisdiction: 'San Juan', bodyName: 'CPASJ' }],
}

describe('professionalProfileUpsertSchema', () => {
  it('accepts valid payload with one registration', () => {
    const parsed = professionalProfileUpsertSchema.safeParse(validBase)
    expect(parsed.success).toBe(true)
  })

  it('rejects invalid CUIT format', () => {
    const parsed = professionalProfileUpsertSchema.safeParse({
      ...validBase,
      cuit: '20123456789',
    })
    expect(parsed.success).toBe(false)
  })

  it('requires http(s) for websiteUrl when set', () => {
    const parsed = professionalProfileUpsertSchema.safeParse({
      ...validBase,
      websiteUrl: 'example.com',
    })
    expect(parsed.success).toBe(false)
  })

  it('registration schema no incluye titleGrammarGender', () => {
    const parsed = professionalProfileUpsertSchema.safeParse(validBase)
    expect(parsed.success).toBe(true)
    if (parsed.success)
      expect(parsed.data.registrations[0]).not.toHaveProperty('titleGrammarGender')
  })
})

describe('toPublicProfessionalProfile', () => {
  it('strips cuit and maps registrations', () => {
    const full = {
      id: 'p1',
      accountOwnerId: 'u1',
      professionalTitle: 'AGRIMENSOR' as const,
      displayName: 'Ana Pérez',
      phone: '2644000000',
      whatsapp: null,
      professionalEmail: 'pro@example.com',
      addressLine1: 'Calle 1',
      addressLine2: null,
      locality: 'Capital',
      province: 'San Juan',
      postalCode: '5400',
      websiteUrl: 'https://example.com',
      cuit: '20-12345678-9',
      dni: '12345678',
      sexo: 'Femenino',
      createdAt: new Date(),
      updatedAt: new Date(),
      registrations: [
        {
          id: 'r1',
          professionalId: 'p1',
          licenseNumber: '99',
          jurisdiction: 'San Juan',
          bodyName: 'CPASJ',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      active: true,
    } satisfies FullProfessionalProfile

    const pub = toPublicProfessionalProfile(full)
    expect(pub).not.toHaveProperty('cuit')
    expect(pub.registrations[0]).toEqual({
      licenseNumber: '99',
      jurisdiction: 'San Juan',
      bodyName: 'CPASJ',
    })
    expect(pub.displayName).toBe('Ana Pérez')
  })
})
