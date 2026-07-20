'use server'

import { redirect } from 'next/navigation'
import { getSessionUserId } from '@/lib/auth/session'
import {
  assertExpedienteProfessionalsAllowed,
  resolvePrincipalForNewExpediente,
} from '@/lib/expediente/ui-rules'
import { buildExpedienteNuevaRaw } from '@/lib/expediente/validate-nueva-client'
import { expedienteNuevaSchema } from '@/lib/expediente/schemas'
import { serverBaroPost } from '@/lib/api/server'
import type { ApiResponse, BaroExpedienteDto } from '@hubilee/contracts'
import type { DatosFields, OrdenanteRow } from '@/stores/expediente-store'

export type ExpedienteNuevaState =
  | { ok: true; message: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> }

function optTrim(s: string | null | undefined): string | null {
  const t = s?.trim()
  return t && t.length > 0 ? t : null
}

export async function submitExpedienteNueva(
  datos: DatosFields,
  ordenantes: OrdenanteRow[] = []
): Promise<ExpedienteNuevaState> {
  const parsed = expedienteNuevaSchema.safeParse(buildExpedienteNuevaRaw(datos))
  if (!parsed.success) {
    return { ok: false, message: 'Los datos del expediente no son válidos.' }
  }

  const userId = await getSessionUserId()
  if (!userId) {
    return { ok: false, message: 'No autenticado. Volvé a iniciar sesión.' }
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
  const principalResolved = await resolvePrincipalForNewExpediente(userId, actuantesOrdered)
  if ('ok' in principalResolved) {
    return {
      ok: false,
      message: principalResolved.message,
      fieldErrors: principalResolved.fieldErrors,
    }
  }
  const { principalProfessionalId, secondProfessionalId } = principalResolved

  try {
    const res = await serverBaroPost<ApiResponse<BaroExpedienteDto>>('/expedientes', {
      objetoExpedienteId: d.objetoExpedienteId,
      nomenclaturaCatastral: d.nomenclaturaCatastral,
      nomenclaturaAnulada: d.nomenclaturaAnulada,
      propietario: d.propietario,
      principalProfessionalId,
      secondProfessionalId: secondProfessionalId ?? undefined,
      actuantesIds: actuantesOrdered,
      fechaOrdenTrabajo: optTrim(d.fechaOrdenTrabajo),
      planoAntecedente: optTrim(d.planoAntecedente),
      loteFraccion: optTrim(d.loteFraccion),
      domicilioParcela: optTrim(d.domicilioParcela),
      parcial: d.parcial,
      soloOrdenTrabajo: d.soloOrdenTrabajo,
      domicilioPropietario: optTrim(d.domicilioPropietario),
      inscripcionDominio: optTrim(d.inscripcionDominio),
      naturalezaActo: optTrim(d.naturalezaActo),
      memoriaObservaciones: optTrim(d.memoriaObservaciones),
      motivoHidraulica: optTrim(d.motivoHidraulica),
      motivoFiscalia: optTrim(d.motivoFiscalia),
      municipio: optTrim(d.municipio),
      requiereVisacionMunicipal: d.requiereVisacionMunicipal,
      ordenantes: ordenantes
        .filter((o) => o.nombre.trim())
        .map((o) => ({
          nombre: o.nombre.trim(),
          documento: o.documento.trim(),
          sexo: o.sexo.trim(),
          cuit: o.cuit.trim(),
          domicilio: o.domicilio.trim(),
          caracter: o.caracter.trim(),
          esPropietario: o.esPropietario,
        })),
    })
    if (!res.success || !res.data) {
      return { ok: false, message: res.message ?? 'No se pudo guardar el expediente.' }
    }
    redirect(`/expedientes/${res.data.id}`)
  } catch (e) {
    console.error('[submitExpedienteNueva]', e)
    return {
      ok: false,
      message: 'No se pudo guardar el expediente. Intentá de nuevo.',
    }
  }
}
