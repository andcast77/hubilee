import type { BaroProfessionalTitle, BaroTitleGrammarGender } from '@hubilee/contracts'

type ProfessionalTitle = BaroProfessionalTitle
type TitleGrammarGender = BaroTitleGrammarGender

/** Registro mínimo para elegir matrícula «representativa» (San Juan + más antigua). */
export type RepresentativePickable = {
  jurisdiction: string
  createdAt: Date
  licenseNumber: string
}

/** Mapea el campo `sexo` del profesional a género gramatical para textos de documentos. */
export function sexoToGrammarGender(sexo: string): TitleGrammarGender {
  return sexo.toLowerCase() === 'femenino' ? 'FEMENINO' : 'MASCULINO'
}

/** Misma regla que la orden de trabajo: jurisdicciones con «san juan» si hay; si no, todas; dentro del pool, matrícula más antigua (`createdAt`). */
export function pickRepresentativeRegistration<T extends RepresentativePickable>(
  registrations: T[]
): T | null {
  if (registrations.length === 0) return null
  const sj = registrations.filter((r) => r.jurisdiction.toLowerCase().includes('san juan'))
  const pool = sj.length > 0 ? sj : registrations
  return pool.reduce((a, b) => (a.createdAt <= b.createdAt ? a : b))
}

/** Título de exhibición + género gramatical (el título es único por profesional). */
export function summarizeProfessionalTitles(
  professionalTitle: ProfessionalTitle,
  sexo: string
): {
  professionalTitle: ProfessionalTitle
  titleGrammarGender: TitleGrammarGender
} {
  return {
    professionalTitle,
    titleGrammarGender: sexoToGrammarGender(sexo),
  }
}
