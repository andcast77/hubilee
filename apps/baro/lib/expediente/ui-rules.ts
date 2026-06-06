/**
 * Reglas de expediente que requieren servidor (Prisma). No importar desde componentes cliente.
 */

import 'server-only'

import { prisma } from '@/lib/prisma'

import { principalSecondFromActuantes } from '@/lib/expediente/ui-shell'
import type { ExpedienteActuantesInput } from '@/lib/expediente/ui-shell'

export type ExpedienteProfessionalsError = {
  ok: false
  message: string
  fieldErrors: Record<string, string[]>
}

/**
 * Actuantes deben ser profesionales del estudio (`Professional.accountOwnerId`).
 */
export async function assertExpedienteProfessionalsAllowed(
  userId: string,
  input: ExpedienteActuantesInput
): Promise<{ ok: true } | ExpedienteProfessionalsError> {
  const rows = await prisma.professional.findMany({
    where: { accountOwnerId: userId },
    select: { id: true },
  })

  const allowedIds = new Set(rows.map((r) => r.id))
  const ids = input.actuantesIds.map((x) => x.trim()).filter(Boolean)

  if (ids.length === 0) {
    return { ok: true }
  }

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

/** Alta de expediente: si no hay actuantes en borrador, usa titular o primer profesional activo solo para el FK legacy. */
export async function resolvePrincipalForNewExpediente(
  userId: string,
  actuantesOrdered: string[]
): Promise<
  | { principalProfessionalId: string; secondProfessionalId: string | null }
  | ExpedienteProfessionalsError
> {
  if (actuantesOrdered.length > 0) {
    return principalSecondFromActuantes(actuantesOrdered)
  }

  const owner = await prisma.user.findUnique({
    where: { id: userId },
    select: { titularProfessionalId: true },
  })
  const pros = await prisma.professional.findMany({
    where: { accountOwnerId: userId, active: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  })
  const pro =
    (owner?.titularProfessionalId
      ? pros.find((p) => p.id === owner.titularProfessionalId)
      : null) ?? pros[0]

  if (!pro) {
    return {
      ok: false,
      message: 'No hay profesionales activos en el estudio.',
      fieldErrors: {
        actuantesIds: ['Creá al menos un profesional antes de guardar el expediente.'],
      },
    }
  }

  return { principalProfessionalId: pro.id, secondProfessionalId: null }
}
