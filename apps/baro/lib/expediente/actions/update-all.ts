'use server'

import { revalidatePath } from 'next/cache'
import { getSessionUserId } from '@/lib/auth/session'
import { serverBaroPut } from '@/lib/api/server'
import type { ApiResponse } from '@hubilee/contracts'
import type { DatosFields, PublicacionFields } from '@/stores/expediente-store'

export type UpdateExpedienteFullState =
  | { ok: true; message: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> }

type ColInput = Record<string, unknown>
type TitInput = Record<string, unknown>
type OrdInput = Record<string, unknown>
type LinderosFullInput = Record<string, unknown>

export async function updateExpedienteFull(input: {
  expedienteId: string
  datos: DatosFields
  publicacion: PublicacionFields
  colindantes: ColInput[]
  titulos: TitInput[]
  ordenantes: OrdInput[]
  linderos: LinderosFullInput
}): Promise<UpdateExpedienteFullState> {
  const { expedienteId, datos, publicacion, colindantes, titulos, ordenantes, linderos } = input

  if (!expedienteId) return { ok: false, message: 'Falta el identificador del expediente.' }

  const userId = await getSessionUserId()
  if (!userId) return { ok: false, message: 'No autenticado. Volvé a iniciar sesión.' }

  try {
    const res = await serverBaroPut<ApiResponse<unknown>>(`/expedientes/${expedienteId}/full`, {
      datos,
      publicacion,
      colindantes,
      titulos,
      ordenantes,
      linderos,
    })
    if (!res.success) {
      return { ok: false, message: res.message ?? 'No se pudo guardar. Intentá de nuevo.' }
    }
    revalidatePath(`/expedientes/${expedienteId}`)
    return { ok: true, message: res.message ?? 'Expediente guardado correctamente.' }
  } catch (err) {
    console.error('updateExpedienteFull error:', err)
    return { ok: false, message: 'No se pudo guardar. Intentá de nuevo.' }
  }
}
