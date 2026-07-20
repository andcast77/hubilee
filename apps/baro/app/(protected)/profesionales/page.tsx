import type { ApiProfessionalListItem } from '@/components/app/professional-profile-form'
import { getSessionUserId } from '@/lib/auth/session'
import { serverBaroGetData } from '@/lib/api/server'
import type { BaroProfessionalDto } from '@hubilee/contracts'
import Client from './client'

export type ProfessionalsListRow = ApiProfessionalListItem

function mapProfessional(p: BaroProfessionalDto): ProfessionalsListRow {
  return {
    id: p.id,
    displayName: p.displayName,
    professionalTitle: p.professionalTitle,
    titleGrammarGender: p.titleGrammarGender ?? 'MASCULINO',
    locality: p.locality,
    addressLine1: p.addressLine1,
    createdAt: p.createdAt ?? new Date().toISOString(),
    updatedAt: p.updatedAt ?? new Date().toISOString(),
    active: p.active,
    primaryMatricula: p.primaryMatricula ?? null,
    primaryJurisdiction: p.primaryJurisdiction ?? null,
    registrations: (p.registrations ?? []).map((r) => ({
      id: r.id,
      licenseNumber: r.licenseNumber,
      jurisdiction: r.jurisdiction,
      bodyName: r.bodyName,
    })),
  }
}

export default async function ProfesionalesPage() {
  const userId = await getSessionUserId()

  if (userId === null) {
    return <Client data={{ professionals: [], titularId: null }} />
  }

  const professionals = (await serverBaroGetData<BaroProfessionalDto[]>('/professionals/list')) ?? []
  const titularId = professionals.find((p) => p.isTitular)?.id ?? null

  return (
    <Client
      data={{
        professionals: professionals.map(mapProfessional),
        titularId,
      }}
    />
  )
}
