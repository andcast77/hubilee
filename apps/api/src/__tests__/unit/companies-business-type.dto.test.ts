import { describe, expect, it } from 'vitest'
import { updateCompanyBodySchema } from '../../dto/companies.dto.js'

const VALID = ['VERDULERIA', 'KIOSCO', 'ELECTRONICA', 'ROPA', 'ACCESORIOS', 'OTRO'] as const

describe('updateCompanyBodySchema — businessType', () => {
  it.each(VALID)('accepts valid businessType %s', (businessType) => {
    const parsed = updateCompanyBodySchema.safeParse({ businessType })
    expect(parsed.success).toBe(true)
  })

  it('accepts null businessType (clear)', () => {
    const parsed = updateCompanyBodySchema.safeParse({ businessType: null })
    expect(parsed.success).toBe(true)
  })

  it('accepts omitted businessType', () => {
    const parsed = updateCompanyBodySchema.safeParse({ name: 'Acme' })
    expect(parsed.success).toBe(true)
  })

  it('rejects invalid businessType outside enum (Rubro → Invalid)', () => {
    const parsed = updateCompanyBodySchema.safeParse({ businessType: 'FARMACIA' })
    expect(parsed.success).toBe(false)
  })

  it('rejects lowercase / wrong-case businessType', () => {
    const parsed = updateCompanyBodySchema.safeParse({ businessType: 'kiosco' })
    expect(parsed.success).toBe(false)
  })
})
