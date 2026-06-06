'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getSessionUserId } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'

export type DeleteExpedienteState = { ok: true; message: string } | { ok: false; message: string }

const deleteExpedienteSchema = z.object({ id: z.string().min(1) })

export async function deleteExpediente(
  _prev: DeleteExpedienteState | undefined,
  formData: FormData
): Promise<DeleteExpedienteState> {
  const parsed = deleteExpedienteSchema.safeParse({ id: formData.get('id') })
  if (!parsed.success) {
    return { ok: false, message: 'ID de expediente inválido.' }
  }

  const userId = await getSessionUserId()
  if (!userId) {
    return { ok: false, message: 'No autenticado. Volvé a iniciar sesión.' }
  }

  const existing = await prisma.expediente.findFirst({
    where: { id: parsed.data.id, accountOwnerId: userId },
    select: { id: true },
  })
  if (!existing) {
    return {
      ok: false,
      message: 'No se encontró el expediente o no tenés permiso para eliminarlo.',
    }
  }

  try {
    await prisma.expediente.delete({ where: { id: parsed.data.id } })
  } catch {
    return { ok: false, message: 'No se pudo eliminar el expediente. Intentá de nuevo.' }
  }

  revalidatePath('/expedientes')
  return { ok: true, message: 'Expediente eliminado.' }
}
