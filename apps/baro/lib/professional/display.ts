export type ProfessionalTitleSlug = 'AGRIMENSOR' | 'INGENIERO_AGRIMENSOR'
export type TitleGrammarGenderSlug = 'MASCULINO' | 'FEMENINO'

export function professionalTitleLabel(
  t: ProfessionalTitleSlug,
  grammar: TitleGrammarGenderSlug = 'MASCULINO'
): string {
  const fem = grammar === 'FEMENINO'
  if (t === 'INGENIERO_AGRIMENSOR') return fem ? 'Ingeniera Agrimensora' : 'Ingeniero Agrimensor'
  return fem ? 'Agrimensora' : 'Agrimensor'
}

export function initialsFromDisplayName(
  displayName: string | null | undefined,
  email: string
): string {
  const trimmed = displayName?.trim()
  if (trimmed) {
    const parts = trimmed.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      const a = parts[0][0]
      const b = parts[parts.length - 1][0]
      if (a && b) return (a + b).toUpperCase()
    }
    return trimmed.slice(0, 2).toUpperCase()
  }
  const local = email.includes('@') ? (email.split('@')[0] ?? email) : email
  const cleaned = local.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2)
  const slice = cleaned.length >= 2 ? cleaned : local.slice(0, 2)
  return slice.toUpperCase() || '?'
}

export function sidebarAccountName(
  profileDisplayName: string | null | undefined,
  email: string | undefined
): string {
  const d = profileDisplayName?.trim()
  if (d) return d
  if (email) return email
  return 'Usuario'
}
