'use server'

import { getSessionUserId } from '@/lib/auth/session'
import {
  expedientePublicacionActaUpdateSchema,
  parseExpedientePublicacionActaFormData,
} from '@/lib/expediente/schemas'
import { prisma } from '@/lib/prisma'

export type ExpedientePublicacionActaState =
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

export async function updateExpedientePublicacionActa(
  _prev: ExpedientePublicacionActaState | undefined,
  formData: FormData
): Promise<ExpedientePublicacionActaState> {
  const raw = parseExpedientePublicacionActaFormData(formData)
  const parsed = expedientePublicacionActaUpdateSchema.safeParse(raw)
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

  const d = parsed.data
  try {
    await prisma.expediente.update({
      where: { id: d.expedienteId },
      data: {
        publicacionEdictoFecha: d.publicacionEdictoFecha,
        publicacionEdictoNumero: d.publicacionEdictoNumero,
        boletinOficialNota: d.boletinOficialNota,
        actaNotarialNumero: d.actaNotarialNumero,
        actaNotarialFecha: d.actaNotarialFecha,
        publicacionActaObservaciones: d.publicacionActaObservaciones,
      },
    })
  } catch {
    return {
      ok: false,
      message: 'No se pudo guardar publicación y acta. Intentá de nuevo.',
    }
  }

  return { ok: true, message: 'Publicación y acta guardadas.' }
}
