'use server'

import { getSessionUserId } from '@/lib/auth/session'
import { assertExpedienteProfessionalsAllowed } from '@/lib/expediente/ui-rules'
import { principalSecondForPersist, replaceExpedienteActuantes } from '@/lib/expediente/ui-shell'
import {
  expedienteDatosGeneralesSchema,
  parseExpedienteDatosGeneralesFormData,
} from '@/lib/expediente/schemas'
import {
  summarizeExpedienteFieldErrors,
  zodIssuesToExpedienteFieldErrors,
} from '@/lib/expediente/field-error-messages'
import { prisma } from '@/lib/prisma'

export type ExpedienteDatosGeneralesState =
  | { ok: true; message: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> }

function optTrim(s: string | undefined): string | null {
  const t = s?.trim()
  return t && t.length > 0 ? t : null
}

export async function updateExpedienteDatosGenerales(
  _prev: ExpedienteDatosGeneralesState | undefined,
  formData: FormData
): Promise<ExpedienteDatosGeneralesState> {
  const expedienteId = (formData.get('expedienteId') ?? '').toString().trim()
  if (expedienteId.length === 0) {
    return { ok: false, message: 'Falta el identificador del expediente.' }
  }

  const raw = parseExpedienteDatosGeneralesFormData(formData)
  const parsed = expedienteDatosGeneralesSchema.safeParse(raw)

  if (!parsed.success) {
    const fieldErrors = zodIssuesToExpedienteFieldErrors(parsed.error.issues)
    const detail = summarizeExpedienteFieldErrors(fieldErrors)
    return {
      ok: false,
      message: detail ?? 'Revisá los campos marcados.',
      fieldErrors,
    }
  }

  const userId = await getSessionUserId()
  if (!userId) {
    return { ok: false, message: 'No autenticado. Volvé a iniciar sesión.' }
  }

  const owned = await prisma.expediente.findFirst({
    where: { id: expedienteId, accountOwnerId: userId },
    select: { id: true, principalProfessionalId: true, secondProfessionalId: true },
  })

  if (!owned) {
    return {
      ok: false,
      message: 'No se encontró el expediente o no tenés permiso para editarlo.',
    }
  }

  const profCheck = await assertExpedienteProfessionalsAllowed(userId, parsed.data)
  if (!profCheck.ok) {
    return {
      ok: false,
      message: profCheck.message,
      fieldErrors: profCheck.fieldErrors,
    }
  }

  const d = parsed.data
  const actuantesOrdered = d.actuantesIds.map((x) => x.trim()).filter(Boolean)
  const { principalProfessionalId, secondProfessionalId } = principalSecondForPersist(
    actuantesOrdered,
    owned
      ? {
          principalProfessionalId: owned.principalProfessionalId,
          secondProfessionalId: owned.secondProfessionalId,
        }
      : null
  )

  const fechaOrdenTrabajoPersist = optTrim(d.fechaOrdenTrabajo)

  try {
    await prisma.$transaction(async (tx) => {
      await tx.expediente.update({
        where: { id: expedienteId },
        data: {
          principalProfessionalId,
          secondProfessionalId,
          objetoExpedienteId: d.objetoExpedienteId,
          nomenclaturaCatastral: d.nomenclaturaCatastral,
          planoAntecedente: optTrim(d.planoAntecedente),
          loteFraccion: optTrim(d.loteFraccion),
          domicilioParcela: optTrim(d.domicilioParcela),
          parcial: d.parcial,
          soloOrdenTrabajo: d.soloOrdenTrabajo,
          fechaOrdenTrabajo: d.soloOrdenTrabajo ? fechaOrdenTrabajoPersist : null,
          propietario: d.propietario.trim(),
          domicilioPropietario: optTrim(d.domicilioPropietario),
          inscripcionDominio: optTrim(d.inscripcionDominio),
          naturalezaActo: optTrim(d.naturalezaActo),
          memoriaObservaciones: optTrim(d.memoriaObservaciones),
          motivoHidraulica: optTrim(d.motivoHidraulica),
          motivoFiscalia: optTrim(d.motivoFiscalia),
          municipio: optTrim(d.municipio),
          requiereVisacionMunicipal: d.requiereVisacionMunicipal,
        },
      })

      await replaceExpedienteActuantes(tx, expedienteId, actuantesOrdered)
    })
  } catch {
    return {
      ok: false,
      message: 'No se pudo guardar los datos. Intentá de nuevo.',
    }
  }

  return { ok: true, message: 'Datos generales guardados.' }
}
