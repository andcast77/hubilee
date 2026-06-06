'use server'

import { getSessionUserId } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import {
  expedienteTituloRelacionCreateSchema,
  expedienteTituloRelacionDeleteSchema,
  expedienteTituloRelacionUpdateSchema,
  parseExpedienteTituloRelacionCreateFormData,
  parseExpedienteTituloRelacionDeleteFormData,
  parseExpedienteTituloRelacionUpdateFormData,
} from '@/lib/expediente/schemas'

export type ExpedienteTituloRelacionState =
  | { ok: true; message: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> }

function zodFieldErrors(error: import('zod').ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {}
  for (const issue of error.issues) {
    const path = issue.path.join('.') || '_form'
    if (!fieldErrors[path]) fieldErrors[path] = []
    fieldErrors[path].push(issue.message)
  }
  return fieldErrors
}

export async function createExpedienteTituloRelacion(
  _prev: ExpedienteTituloRelacionState | undefined,
  formData: FormData
): Promise<ExpedienteTituloRelacionState> {
  const raw = parseExpedienteTituloRelacionCreateFormData(formData)
  const parsed = expedienteTituloRelacionCreateSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      ok: false,
      message: 'Revisá los campos marcados.',
      fieldErrors: zodFieldErrors(parsed.error),
    }
  }

  const userId = await getSessionUserId()
  if (!userId) {
    return { ok: false, message: 'No autenticado. Volvé a iniciar sesión.' }
  }

  const owned = await prisma.expediente.findFirst({
    where: { id: parsed.data.expedienteId, accountOwnerId: userId },
    select: { id: true },
  })
  if (!owned) {
    return {
      ok: false,
      message: 'No se encontró el expediente o no tenés permiso para editarlo.',
    }
  }

  const agg = await prisma.expedienteTituloRelacion.aggregate({
    where: { expedienteId: parsed.data.expedienteId },
    _max: { orden: true },
  })
  const nextOrden = (agg._max.orden ?? -1) + 1

  try {
    await prisma.expedienteTituloRelacion.create({
      data: {
        expedienteId: parsed.data.expedienteId,
        orden: nextOrden,
        instrumento: parsed.data.instrumento,
        matricula: parsed.data.matricula,
        fechaTitulo: parsed.data.fechaTitulo,
        observaciones: parsed.data.observaciones,
      },
    })
  } catch {
    return {
      ok: false,
      message: 'No se pudo guardar el vínculo de título. Intentá de nuevo.',
    }
  }

  return { ok: true, message: 'Vínculo agregado a la relación de título.' }
}

export async function updateExpedienteTituloRelacion(
  _prev: ExpedienteTituloRelacionState | undefined,
  formData: FormData
): Promise<ExpedienteTituloRelacionState> {
  const raw = parseExpedienteTituloRelacionUpdateFormData(formData)
  const parsed = expedienteTituloRelacionUpdateSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      ok: false,
      message: 'Revisá los campos marcados.',
      fieldErrors: zodFieldErrors(parsed.error),
    }
  }

  const userId = await getSessionUserId()
  if (!userId) {
    return { ok: false, message: 'No autenticado. Volvé a iniciar sesión.' }
  }

  const existing = await prisma.expedienteTituloRelacion.findFirst({
    where: {
      id: parsed.data.id,
      expediente: { accountOwnerId: userId },
    },
    select: { id: true },
  })
  if (!existing) {
    return {
      ok: false,
      message: 'No se encontró el registro o no tenés permiso para editarlo.',
    }
  }

  const d = parsed.data
  const data: {
    instrumento?: string
    matricula?: string
    fechaTitulo?: string
    observaciones?: string | null
  } = {}
  if (d.instrumento !== undefined) data.instrumento = d.instrumento
  if (d.matricula !== undefined) data.matricula = d.matricula
  if (d.fechaTitulo !== undefined) data.fechaTitulo = d.fechaTitulo
  if (d.observaciones !== undefined) data.observaciones = d.observaciones

  try {
    await prisma.expedienteTituloRelacion.update({
      where: { id: parsed.data.id },
      data,
    })
  } catch {
    return {
      ok: false,
      message: 'No se pudo actualizar el vínculo. Intentá de nuevo.',
    }
  }

  return { ok: true, message: 'Relación de título actualizada.' }
}

export async function deleteExpedienteTituloRelacion(
  _prev: ExpedienteTituloRelacionState | undefined,
  formData: FormData
): Promise<ExpedienteTituloRelacionState> {
  const raw = parseExpedienteTituloRelacionDeleteFormData(formData)
  const parsed = expedienteTituloRelacionDeleteSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      ok: false,
      message: 'Revisá los campos marcados.',
      fieldErrors: zodFieldErrors(parsed.error),
    }
  }

  const userId = await getSessionUserId()
  if (!userId) {
    return { ok: false, message: 'No autenticado. Volvé a iniciar sesión.' }
  }

  const existing = await prisma.expedienteTituloRelacion.findFirst({
    where: {
      id: parsed.data.id,
      expediente: { accountOwnerId: userId },
    },
    select: { id: true },
  })
  if (!existing) {
    return {
      ok: false,
      message: 'No se encontró el registro o no tenés permiso para eliminarlo.',
    }
  }

  try {
    await prisma.expedienteTituloRelacion.delete({
      where: { id: parsed.data.id },
    })
  } catch {
    return {
      ok: false,
      message: 'No se pudo eliminar el vínculo. Intentá de nuevo.',
    }
  }

  return { ok: true, message: 'Vínculo eliminado de la relación de título.' }
}
