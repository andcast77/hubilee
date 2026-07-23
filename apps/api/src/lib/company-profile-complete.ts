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
