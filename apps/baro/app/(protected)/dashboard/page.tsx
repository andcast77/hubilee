import { WorkspaceDashboard } from '@/components/app/workspace-dashboard'
import { getSessionUserId } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'

export default async function AppHomePage() {
  const userId = await getSessionUserId()

  if (!userId) {
    return <WorkspaceDashboard expedienteCount={0} professionalCount={0} recentExpedientes={[]} />
  }

  const [expedienteCount, professionalCount, recentRows] = await Promise.all([
    prisma.expediente.count({ where: { accountOwnerId: userId } }),
    prisma.professional.count({ where: { accountOwnerId: userId } }),
    prisma.expediente.findMany({
      where: { accountOwnerId: userId },
      orderBy: { updatedAt: 'desc' },
      take: 8,
      select: {
        id: true,
        nomenclaturaCatastral: true,
        propietario: true,
        updatedAt: true,
      },
    }),
  ])

  return (
    <WorkspaceDashboard
      expedienteCount={expedienteCount}
      professionalCount={professionalCount}
      recentExpedientes={recentRows.map((m) => ({
        id: m.id,
        nomenclaturaCatastral: m.nomenclaturaCatastral,
        propietario: m.propietario,
        updatedAt: m.updatedAt.toISOString(),
      }))}
    />
  )
}
