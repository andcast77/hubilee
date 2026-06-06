'use server'

import { getSessionUserId } from '@/lib/auth/session'
import {
  expedienteColindanteCreateSchema,
  expedienteColindanteDeleteSchema,
  expedienteColindanteUpdateSchema,
  parseExpedienteColindanteCreateFormData,
  parseExpedienteColindanteDeleteFormData,
  parseExpedienteColindanteUpdateFormData,
} from '@/lib/expediente/schemas'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

export type ExpedienteColindantesState =
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

export async function createExpedienteColindante(
  _prev: ExpedienteColindantesState | undefined,
  formData: FormData
): Promise<ExpedienteColindantesState> {
  const raw = parseExpedienteColindanteCreateFormData(formData)
  const parsed = expedienteColindanteCreateSchema.safeParse(raw)
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

  const agg = await prisma.expedienteColindante.aggregate({
    where: { expedienteId: parsed.data.expedienteId },
    _max: { orden: true },
  })
  const nextOrden = (agg._max.orden ?? -1) + 1

  try {
    await prisma.expedienteColindante.create({
      data: {
        expedienteId: parsed.data.expedienteId,
        orden: nextOrden,
        distancia: '',
        colindante: parsed.data.colindante,
        descripcion: parsed.data.descripcion,
        notificaA: parsed.data.notificaA,
        domicilioParcelaColindante: parsed.data.domicilioParcelaColindante,
        domicilioTitularColindante: parsed.data.domicilioTitularColindante,
        dirigidoA: parsed.data.dirigidoA,
        nomenclaturas: {
          create: parsed.data.nomenclaturas.map((n, j) => ({
            orden: j,
            nomenclatura: n.nomenclatura.trim(),
            rumbo: n.rumbo.trim(),
          })),
        },
      },
    })
  } catch {
    return {
      ok: false,
      message: 'No se pudo guardar el colindante. Intentá de nuevo.',
    }
  }

  return { ok: true, message: 'Colindante agregado.' }
}

export async function updateExpedienteColindante(
  _prev: ExpedienteColindantesState | undefined,
  formData: FormData
): Promise<ExpedienteColindantesState> {
  const raw = parseExpedienteColindanteUpdateFormData(formData)
  const parsed = expedienteColindanteUpdateSchema.safeParse(raw)
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

  const existing = await prisma.expedienteColindante.findFirst({
    where: {
      id: parsed.data.id,
      expediente: { accountOwnerId: userId },
    },
    select: { id: true },
  })
  if (!existing) {
    return {
      ok: false,
      message: 'No se encontró el colindante o no tenés permiso para editarlo.',
    }
  }

  const d = parsed.data
  const data: Prisma.ExpedienteColindanteUpdateInput = {}
  if (d.distancia !== undefined) data.distancia = d.distancia
  if (d.colindante !== undefined) data.colindante = d.colindante
  if (d.descripcion !== undefined) data.descripcion = d.descripcion
  if (d.notificaA !== undefined) data.notificaA = d.notificaA
  if (d.domicilioParcelaColindante !== undefined) {
    data.domicilioParcelaColindante = d.domicilioParcelaColindante
  }
  if (d.domicilioTitularColindante !== undefined) {
    data.domicilioTitularColindante = d.domicilioTitularColindante
  }
  if (d.dirigidoA !== undefined) data.dirigidoA = d.dirigidoA

  try {
    await prisma.expedienteColindante.update({
      where: { id: parsed.data.id },
      data,
    })
  } catch {
    return {
      ok: false,
      message: 'No se pudo actualizar el colindante. Intentá de nuevo.',
    }
  }

  return { ok: true, message: 'Colindante actualizado.' }
}

export async function deleteExpedienteColindante(
  _prev: ExpedienteColindantesState | undefined,
  formData: FormData
): Promise<ExpedienteColindantesState> {
  const raw = parseExpedienteColindanteDeleteFormData(formData)
  const parsed = expedienteColindanteDeleteSchema.safeParse(raw)
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

  const existing = await prisma.expedienteColindante.findFirst({
    where: {
      id: parsed.data.id,
      expediente: { accountOwnerId: userId },
    },
    select: { id: true },
  })
  if (!existing) {
    return {
      ok: false,
      message: 'No se encontró el colindante o no tenés permiso para eliminarlo.',
    }
  }

  try {
    await prisma.expedienteColindante.delete({
      where: { id: parsed.data.id },
    })
  } catch {
    return {
      ok: false,
      message: 'No se pudo eliminar el colindante. Intentá de nuevo.',
    }
  }

  return { ok: true, message: 'Colindante eliminado.' }
}
