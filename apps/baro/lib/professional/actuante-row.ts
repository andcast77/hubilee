import type { ProfessionalTitle } from '@prisma/client'
import {
  pickRepresentativeRegistration,
  summarizeProfessionalTitles,
  type RepresentativePickable,
} from '@/lib/professional/registration-pick'

export type ActuanteProfessionalRow = {
  id: string
  displayName: string
  professionalTitle: 'AGRIMENSOR' | 'INGENIERO_AGRIMENSOR'
  titleGrammarGender: 'MASCULINO' | 'FEMENINO'
  locality: string
  phone: string | null
  professionalEmail: string | null
  primaryMatricula: string | null
  primaryJurisdiction: string | null
  isTitular: boolean
  active: boolean
}

export type ProfessionalForActuanteRow = {
  id: string
  displayName: string
  professionalTitle: ProfessionalTitle
  sexo: string
  locality: string
  phone: string | null
  professionalEmail: string | null
  active?: boolean
  registrations?: (RepresentativePickable & { bodyName?: string | null })[]
}

export function mapProfessionalToActuanteRow(
  p: ProfessionalForActuanteRow,
  opts?: { isTitular?: boolean }
): ActuanteProfessionalRow {
  const rep = pickRepresentativeRegistration(p.registrations ?? [])
  const titles = summarizeProfessionalTitles(p.professionalTitle, p.sexo)
  return {
    id: p.id,
    displayName: p.displayName,
    professionalTitle: titles.professionalTitle,
    titleGrammarGender: titles.titleGrammarGender,
    locality: p.locality,
    phone: p.phone ?? null,
    professionalEmail: p.professionalEmail ?? null,
    primaryMatricula: rep?.licenseNumber ?? null,
    primaryJurisdiction: rep?.jurisdiction ?? null,
    isTitular: opts?.isTitular ?? false,
    active: p.active ?? true,
  }
}
