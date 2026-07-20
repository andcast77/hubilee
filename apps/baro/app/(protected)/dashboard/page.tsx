import { WorkspaceDashboard } from '@/components/app/workspace-dashboard'
import { getSessionUserId } from '@/lib/auth/session'
import { serverBaroGetData } from '@/lib/api/server'
import type { BaroExpedienteDto, BaroProfessionalDto } from '@hubilee/contracts'

export default async function AppHomePage() {
  const userId = await getSessionUserId()

  if (!userId) {
    return <WorkspaceDashboard expedienteCount={0} professionalCount={0} recentExpedientes={[]} />
  }

  const [expedientes, professionals] = await Promise.all([
    serverBaroGetData<BaroExpedienteDto[]>('/expedientes'),
    serverBaroGetData<BaroProfessionalDto[]>('/professionals/list'),
  ])

  const rows = expedientes ?? []
  const recentRows = [...rows]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 8)

  return (
    <WorkspaceDashboard
      expedienteCount={rows.length}
      professionalCount={professionals?.length ?? 0}
      recentExpedientes={recentRows.map((m) => ({
        id: m.id,
        nomenclaturaCatastral: m.nomenclaturaCatastral,
        propietario: m.propietario,
        updatedAt: m.updatedAt,
      }))}
    />
  )
}
