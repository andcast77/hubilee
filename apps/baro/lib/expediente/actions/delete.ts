'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getSessionUserId } from '@/lib/auth/session'
import { serverBaroDelete } from '@/lib/api/server'
import type { ApiResponse } from '@hubilee/contracts'

const deleteExpedienteSchema = z.object({ id: z.string().min(1) })

export async function deleteExpediente(
  _prev: unknown,
  formData: FormData
): Promise<{ ok: boolean; message?: string }> {
  const parsed = deleteExpedienteSchema.safeParse({ id: formData.get('id') })
  if (!parsed.success) return { ok: false, message: 'Identificador inválido.' }

  const userId = await getSessionUserId()
  if (!userId) return { ok: false, message: 'No autenticado.' }

  try {
    const res = await serverBaroDelete<ApiResponse<unknown>>(`/expedientes/${parsed.data.id}`)
    if (!res.success) return { ok: false, message: res.message ?? 'No se pudo eliminar.' }
    revalidatePath('/expedientes')
    return { ok: true }
  } catch {
    return { ok: false, message: 'No se pudo eliminar el expediente.' }
  }
}
