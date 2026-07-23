/**
 * Determines whether a company's fiscal profile is complete.
 *
 * A profile is complete when:
 * - `name` is non-empty (after trim) AND not the sentinel "mi empresa" placeholder
 * - `taxId` is non-empty (after trim)
 *
 * Address, phone, and logo are NOT required for completeness.
 *
 * @param c - Partial company data with at least `name` and `taxId`
 * @returns `true` if the company fiscal profile is complete, `false` otherwise
 */
/** Sentinel company name assigned by Google register when name is unavailable. */
const PLACEHOLDER_COMPANY_NAME = 'mi empresa'

export function isCompanyProfileComplete(c: {
  name: string | null
  taxId: string | null
}): boolean {
  const name = c.name?.trim() ?? ''
  const taxId = c.taxId?.trim() ?? ''

  if (!name || !taxId) return false
  if (name.toLowerCase() === PLACEHOLDER_COMPANY_NAME) return false

  return true
}

// ── Registration wizard ──────────────────────────────────────────────────────

/**
 * Steps in the POS OWNER registration wizard, in order.
 * CUENTA is always complete once the user is authenticated (early account after verify).
 */
export type WizardStep = 'CUENTA' | 'EMPRESA' | 'RUBRO' | 'LOCAL'

export type RegistrationData = {
  name: string | null
  taxId: string | null
  businessType: string | null
  storeCount: number
  cashRegisterCount: number
}

/**
 * Whether the POS OWNER registration wizard is fully complete.
 *
 * Complete iff ALL of:
 * 1. Empresa profile complete (real name + taxId)
 * 2. Rubro set (businessType non-null)
 * 3. At least one Store exists
 * 4. At least one CashRegister exists
 *
 * Pure function — deterministic, no side effects.
 */
export function registrationWizardComplete(data: RegistrationData): boolean {
  if (!isCompanyProfileComplete({ name: data.name, taxId: data.taxId })) {
    return false
  }
  if (!data.businessType?.trim()) return false
  if (data.storeCount < 1) return false
  if (data.cashRegisterCount < 1) return false

  return true
}

/**
 * Returns the **first incomplete step** in the registration wizard, or `null`
 * if the wizard is fully complete.
 *
 * Steps are evaluated in order: CUENTA → EMPRESA → RUBRO → LOCAL.
 * CUENTA is always considered complete (the user is authenticated).
 *
 * Pure function — deterministic, no side effects.
 */
export function registrationWizardStep(data: RegistrationData): WizardStep | null {
  // CUENTA is always complete (user is authenticated with early account)

  // EMPRESA step
  if (!isCompanyProfileComplete({ name: data.name, taxId: data.taxId })) {
    return 'EMPRESA'
  }

  // RUBRO step
  if (!data.businessType?.trim()) {
    return 'RUBRO'
  }

  // LOCAL step (includes requirement of at least one CashRegister)
  if (data.storeCount < 1 || data.cashRegisterCount < 1) {
    return 'LOCAL'
  }

  // All complete
  return null
}
