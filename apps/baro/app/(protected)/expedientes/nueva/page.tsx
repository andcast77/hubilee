import { notFound } from 'next/navigation'
import { NuevaExpedienteForm } from '@/components/app/expedientes/nueva-expediente-form'
import type { ProfessionalForForm } from '@/components/app/expedientes/expediente-datos-generales-form'
import { getSessionUserId } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import {
  pickRepresentativeRegistration,
  summarizeProfessionalTitles,
} from '@/lib/professional/registration-pick'

export const dynamic = 'force-dynamic'

const registrationOrderBy = [{ jurisdiction: 'asc' as const }, { licenseNumber: 'asc' as const }]

export default async function NuevaExpedientePage() {
  const userId = await getSessionUserId()
  if (!userId) notFound()

  const [account, rawProfessionals] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { titularProfessionalId: true },
    }),
    prisma.professional.findMany({
      where: { accountOwnerId: userId },
      orderBy: { displayName: 'asc' },
      select: {
        id: true,
        displayName: true,
        sexo: true,
        professionalTitle: true,
        locality: true,
        phone: true,
        professionalEmail: true,
        active: true,
        registrations: {
          orderBy: registrationOrderBy,
          select: {
            licenseNumber: true,
            jurisdiction: true,
            bodyName: true,
            createdAt: true,
          },
        },
      },
    }),
  ])

  const titularId = account?.titularProfessionalId ?? null

  const professionals: ProfessionalForForm[] = rawProfessionals.map((p) => {
    const rep = pickRepresentativeRegistration(p.registrations)
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
      isTitular: p.id === titularId,
      active: p.active,
    }
  })

  return <NuevaExpedienteForm professionals={professionals} titularId={titularId} />
}
