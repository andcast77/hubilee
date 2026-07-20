'use server'

import 'server-only'

import { serverBaroGetData } from '@/lib/api/server'
import type { BaroProfessionalDto } from '@hubilee/contracts'
import { principalSecondFromActuantes } from '@/lib/expediente/ui-shell'
import type { ExpedienteActuantesInput } from '@/lib/expediente/ui-shell'

export type ExpedienteProfessionalsError = {
  ok: false
  message: string
  fieldErrors: Record<string, string[]>
}

async function listCompanyProfessionals(): Promise<BaroProfessionalDto[]> {
  return (await serverBaroGetData<BaroProfessionalDto[]>('/professionals/list')) ?? []
}

export async function assertExpedienteProfessionalsAllowed(
  _userId: string,
  input: ExpedienteActuantesInput
): Promise<{ ok: true } | ExpedienteProfessionalsError> {
  const rows = await listCompanyProfessionals()
  const allowedIds = new Set(rows.map((r) => r.id))
  const ids = input.actuantesIds.map((x) => x.trim()).filter(Boolean)

  if (ids.length === 0) return { ok: true }

  const bad = ids.find((id) => !allowedIds.has(id))
  if (bad) {
    return {
      ok: false,
      message: 'Un actuante no es válido.',
      fieldErrors: {
        actuantesIds: ['Solo podés incluir profesionales de tu estudio. Revisá la lista.'],
      },
    }
  }

  return { ok: true }
}

export async function resolvePrincipalForNewExpediente(
  _userId: string,
  actuantesOrdered: string[]
): Promise<
  | { principalProfessionalId: string; secondProfessionalId: string | null }
  | ExpedienteProfessionalsError
> {
  if (actuantesOrdered.length > 0) {
    return principalSecondFromActuantes(actuantesOrdered)
  }

  const pros = (await listCompanyProfessionals()).filter((p) => p.active)
  const titular = pros.find((p) => p.isTitular) ?? pros[0]

  if (!titular) {
    return {
      ok: false,
      message: 'No hay profesionales activos en el estudio.',
      fieldErrors: {
        actuantesIds: ['Creá al menos un profesional antes de guardar el expediente.'],
      },
    }
  }

  return { principalProfessionalId: titular.id, secondProfessionalId: null }
}
