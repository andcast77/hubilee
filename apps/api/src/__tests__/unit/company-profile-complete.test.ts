import { describe, it, expect } from 'vitest'
import { isCompanyProfileComplete } from '../../lib/company-profile-complete.js'

describe('isCompanyProfileComplete', () => {
  // ---- False cases ----

  it('returns false when name is empty string', () => {
    expect(isCompanyProfileComplete({ name: '', taxId: 'RFC-123' })).toBe(false)
  })

  it('returns false when name is whitespace-only', () => {
    expect(isCompanyProfileComplete({ name: '   ', taxId: 'RFC-123' })).toBe(false)
  })

  it('returns false when name is null', () => {
    expect(isCompanyProfileComplete({ name: null, taxId: 'RFC-123' })).toBe(false)
  })

  it('returns false when taxId is empty string', () => {
    expect(isCompanyProfileComplete({ name: 'Mi Empresa SRL', taxId: '' })).toBe(false)
  })

  it('returns false when taxId is whitespace-only', () => {
    expect(isCompanyProfileComplete({ name: 'Mi Empresa SRL', taxId: '   ' })).toBe(false)
  })

  it('returns false when taxId is null', () => {
    expect(isCompanyProfileComplete({ name: 'Mi Empresa SRL', taxId: null })).toBe(false)
  })

  it('returns false when both name and taxId are empty', () => {
    expect(isCompanyProfileComplete({ name: '', taxId: '' })).toBe(false)
  })

  it('returns false for case-insensitive "mi empresa" sentinel', () => {
    expect(isCompanyProfileComplete({ name: 'mi empresa', taxId: 'RFC-123' })).toBe(false)
  })

  it('returns false for capitalized "Mi Empresa" sentinel', () => {
    expect(isCompanyProfileComplete({ name: 'Mi Empresa', taxId: 'RFC-123' })).toBe(false)
  })

  it('returns false for "MI EMPRESA" all-caps sentinel', () => {
    expect(isCompanyProfileComplete({ name: 'MI EMPRESA', taxId: 'RFC-123' })).toBe(false)
  })

  it('returns false for whitespace-surrounded sentinel', () => {
    expect(isCompanyProfileComplete({ name: '  Mi Empresa  ', taxId: 'RFC-123' })).toBe(false)
  })

  // ---- True cases ----

  it('returns true for real name and taxId with null address/phone/logo', () => {
    expect(isCompanyProfileComplete({ name: 'Comercial Mexicana', taxId: 'CME-2024-ABC' })).toBe(true)
  })

  it('returns true for real name and taxId with leading/trailing whitespace', () => {
    expect(isCompanyProfileComplete({ name: '  Mi Empresa Real  ', taxId: 'RFC-456' })).toBe(true)
  })

  it('returns true for a company with accented name and valid taxId', () => {
    expect(isCompanyProfileComplete({ name: 'Tecnología Avanzada S.A. de C.V.', taxId: 'TA-123456' })).toBe(true)
  })
})
