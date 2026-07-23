import { describe, it, expect } from 'vitest'
import { isCompanyProfileComplete, registrationWizardComplete, registrationWizardStep } from '../../lib/company-profile-complete.js'

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

// ─── Registration Wizard Complete ───────────────────────────────────────────

describe('registrationWizardComplete', () => {
  // ── Complete scenarios ──

  it('returns true when empresa complete + rubro + 1 store + 1 caja', () => {
    expect(registrationWizardComplete({
      name: 'Tienda Real SRL',
      taxId: 'RFC-123',
      businessType: 'VERDULERIA',
      storeCount: 1,
      cashRegisterCount: 1,
    })).toBe(true)
  })

  it('returns true for any valid businessType with multiple stores and cajas', () => {
    expect(registrationWizardComplete({
      name: 'Electro SA',
      taxId: 'EL-456',
      businessType: 'ELECTRONICA',
      storeCount: 3,
      cashRegisterCount: 5,
    })).toBe(true)
  })

  // ── Incomplete: Empresa ──

  it('returns false when empresa name is placeholder "mi empresa"', () => {
    expect(registrationWizardComplete({
      name: 'mi empresa',
      taxId: 'RFC-123',
      businessType: 'VERDULERIA',
      storeCount: 1,
      cashRegisterCount: 1,
    })).toBe(false)
  })

  it('returns false when empresa taxId is empty', () => {
    expect(registrationWizardComplete({
      name: 'Tienda Real SRL',
      taxId: '',
      businessType: 'VERDULERIA',
      storeCount: 1,
      cashRegisterCount: 1,
    })).toBe(false)
  })

  // ── Incomplete: Rubro ──

  it('returns false when businessType is null', () => {
    expect(registrationWizardComplete({
      name: 'Tienda Real SRL',
      taxId: 'RFC-123',
      businessType: null,
      storeCount: 1,
      cashRegisterCount: 1,
    })).toBe(false)
  })

  // ── Incomplete: Local ──

  it('returns false when no stores', () => {
    expect(registrationWizardComplete({
      name: 'Tienda Real SRL',
      taxId: 'RFC-123',
      businessType: 'KIOSCO',
      storeCount: 0,
      cashRegisterCount: 0,
    })).toBe(false)
  })

  // ── Incomplete: Caja ──

  it('returns false when stores exist but no cash registers', () => {
    expect(registrationWizardComplete({
      name: 'Tienda Real SRL',
      taxId: 'RFC-123',
      businessType: 'ROPA',
      storeCount: 1,
      cashRegisterCount: 0,
    })).toBe(false)
  })
})

// ─── Registration Wizard Step ───────────────────────────────────────────────

describe('registrationWizardStep', () => {
  it('returns "EMPRESA" when company profile is incomplete (placeholder name)', () => {
    expect(registrationWizardStep({
      name: 'mi empresa',
      taxId: null,
      businessType: null,
      storeCount: 0,
      cashRegisterCount: 0,
    })).toBe('EMPRESA')
  })

  it('returns "EMPRESA" when taxId is missing', () => {
    expect(registrationWizardStep({
      name: 'Tienda Real SRL',
      taxId: '',
      businessType: null,
      storeCount: 0,
      cashRegisterCount: 0,
    })).toBe('EMPRESA')
  })

  it('returns "RUBRO" when empresa complete but businessType missing', () => {
    expect(registrationWizardStep({
      name: 'Tienda Real SRL',
      taxId: 'RFC-123',
      businessType: null,
      storeCount: 0,
      cashRegisterCount: 0,
    })).toBe('RUBRO')
  })

  it('returns "LOCAL" when empresa+rubro done but no stores', () => {
    expect(registrationWizardStep({
      name: 'Tienda Real SRL',
      taxId: 'RFC-123',
      businessType: 'OTRO',
      storeCount: 0,
      cashRegisterCount: 0,
    })).toBe('LOCAL')
  })

  it('returns "LOCAL" when empresa+rubro done but stores exist with no cash registers', () => {
    expect(registrationWizardStep({
      name: 'Tienda Real SRL',
      taxId: 'RFC-123',
      businessType: 'ACCESORIOS',
      storeCount: 1,
      cashRegisterCount: 0,
    })).toBe('LOCAL')
  })

  it('returns null when wizard is fully complete', () => {
    expect(registrationWizardStep({
      name: 'Tienda Real SRL',
      taxId: 'RFC-123',
      businessType: 'VERDULERIA',
      storeCount: 2,
      cashRegisterCount: 3,
    })).toBeNull()
  })
})
