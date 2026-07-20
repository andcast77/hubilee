import { notFound } from 'next/navigation'
import { NuevaExpedienteForm } from '@/components/app/expedientes/nueva-expediente-form'
import type { ProfessionalForForm } from '@/components/app/expedientes/expediente-datos-generales-form'
import { getSessionUserId } from '@/lib/auth/session'
import { serverBaroGetData } from '@/lib/api/server'
import type { BaroProfessionalDto } from '@hubilee/contracts'

export const dynamic = 'force-dynamic'

export default async function NuevaExpedientePage() {
  const userId = await getSessionUserId()
  if (!userId) notFound()

  const rawProfessionals = (await serverBaroGetData<BaroProfessionalDto[]>('/professionals/list')) ?? []
  const titularId = rawProfessionals.find((p) => p.isTitular)?.id ?? null

  const professionals: ProfessionalForForm[] = rawProfessionals.map((p) => ({
    id: p.id,
    displayName: p.displayName,
    professionalTitle: p.professionalTitle,
    titleGrammarGender: p.titleGrammarGender ?? 'MASCULINO',
    locality: p.locality,
    phone: p.phone ?? null,
    professionalEmail: p.professionalEmail ?? null,
    primaryMatricula: p.primaryMatricula ?? null,
    primaryJurisdiction: p.primaryJurisdiction ?? null,
    isTitular: p.id === titularId,
    active: p.active,
  }))

  return <NuevaExpedienteForm professionals={professionals} titularId={titularId} />
}
