import type { ApiProfessionalListItem } from '@/components/app/professional-profile-form'
import { getSessionUserId } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import {
  pickRepresentativeRegistration,
  sexoToGrammarGender,
} from '@/lib/professional/registration-pick'
import Client from './client'

export type ProfessionalsListRow = ApiProfessionalListItem

async function getProfessionalsList(userId: string): Promise<{
  professionals: ProfessionalsListRow[]
  titularId: string | null
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { titularProfessionalId: true },
  })

  const titularId = user?.titularProfessionalId ?? null

  const professionals = await prisma.professional.findMany({
    where: { accountOwnerId: userId },
    orderBy: { createdAt: 'desc' },
    include: {
      registrations: {
        orderBy: [{ jurisdiction: 'asc' }, { licenseNumber: 'asc' }],
        select: {
          id: true,
          licenseNumber: true,
          jurisdiction: true,
          bodyName: true,
          createdAt: true,
        },
      },
    },
  })

  return {
    professionals: professionals.map((p) => {
      const rep = pickRepresentativeRegistration(p.registrations)
      return {
        id: p.id,
        displayName: p.displayName,
        professionalTitle: p.professionalTitle,
        titleGrammarGender: sexoToGrammarGender(p.sexo),
        locality: p.locality,
        addressLine1: p.addressLine1,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        active: p.active,
        primaryMatricula: rep?.licenseNumber ?? null,
        primaryJurisdiction: rep?.jurisdiction ?? null,
        registrations: p.registrations.map((r) => ({
          id: r.id,
          licenseNumber: r.licenseNumber,
          jurisdiction: r.jurisdiction,
          bodyName: r.bodyName,
        })),
      }
    }),
    titularId,
  }
}

export default async function ProfesionalesPage() {
  const userId = await getSessionUserId()

  if (userId === null) {
    return <Client data={{ professionals: [], titularId: null }} />
  }

  const { professionals, titularId } = await getProfessionalsList(userId)

  return <Client data={{ professionals, titularId }} />
}
