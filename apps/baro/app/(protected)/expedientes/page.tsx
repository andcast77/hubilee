import ExpedientesPageClient from './page-client'
import { getSessionUserId } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { expedienteToListRow } from '@/lib/expediente/table'

export default async function ExpedientesPage() {
  const userId = await getSessionUserId()
  const rows =
    userId === null
      ? []
      : (
          await prisma.expediente.findMany({
            where: { accountOwnerId: userId },
            orderBy: { createdAt: 'desc' },
            include: {
              principalProfessional: { select: { displayName: true } },
            },
          })
        ).map(expedienteToListRow)

  return <ExpedientesPageClient initialRows={rows} />
}
