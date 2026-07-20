import ExpedientesPageClient from './page-client'
import { getSessionUserId } from '@/lib/auth/session'
import { serverBaroGetData } from '@/lib/api/server'
import { expedienteToListRow } from '@/lib/expediente/table'
import type { BaroExpedienteDto } from '@hubilee/contracts'

export default async function ExpedientesPage() {
  const userId = await getSessionUserId()
  const rows =
    userId === null
      ? []
      : (await serverBaroGetData<BaroExpedienteDto[]>('/expedientes'))?.map(expedienteToListRow) ??
        []

  return <ExpedientesPageClient initialRows={rows} />
}
