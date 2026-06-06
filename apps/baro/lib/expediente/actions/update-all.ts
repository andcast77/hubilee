'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getSessionUserId } from '@/lib/auth/session'
import { assertExpedienteProfessionalsAllowed } from '@/lib/expediente/ui-rules'
import { principalSecondForPersist, replaceExpedienteActuantes } from '@/lib/expediente/ui-shell'
import {
  expedienteDatosGeneralesSchema,
  expedienteOrdenanteRowSchema,
  expedienteOrdenantesSchema,
  expedientePublicacionActaUpdateSchema,
  expedienteBatchColRowSchema,
  linderosSchema,
} from '@/lib/expediente/schemas'
import { prisma } from '@/lib/prisma'
import type { DatosFields, PublicacionFields } from '@/stores/expediente-store'

const titRowSchema = z.object({
  id: z.string().nullable().optional(),
  instrumento: z.string().trim().min(1, 'El instrumento o acto es obligatorio.'),
  matricula: z.string().trim().default(''),
  fechaTitulo: z.string().trim().default(''),
  observaciones: z.string().nullable().optional().default(null),
})

export type UpdateExpedienteFullState =
  | { ok: true; message: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> }

type ColInput = z.input<typeof expedienteBatchColRowSchema>
type TitInput = {
  id?: string | null
  instrumento: string
  matricula: string
  fechaTitulo: string
  observaciones?: string | null
}
type OrdInput = z.input<typeof expedienteOrdenanteRowSchema>
type LinderosFullInput = z.input<typeof linderosSchema>

function zodFieldErrors(error: import('zod').ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const issue of error.issues) {
    const path = issue.path.join('.') || '_form'
    if (!out[path]) out[path] = []
    out[path].push(issue.message)
  }
  return out
}

function optTrim(s: string | undefined | null): string | null {
  const t = s?.trim()
  return t && t.length > 0 ? t : null
}

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

  const owned = await prisma.expediente.findFirst({
    where: { id: expedienteId, accountOwnerId: userId },
    select: { id: true },
  })
  if (!owned) {
    return { ok: false, message: 'No se encontró el expediente o no tenés permiso para editarlo.' }
  }

  const datosParsed = expedienteDatosGeneralesSchema.safeParse(datos)
  if (!datosParsed.success) {
    return {
      ok: false,
      message: 'Revisá los campos en Datos generales.',
      fieldErrors: zodFieldErrors(datosParsed.error),
    }
  }

  const pubParsed = expedientePublicacionActaUpdateSchema.safeParse({
    expedienteId,
    ...publicacion,
  })
  if (!pubParsed.success) {
    return {
      ok: false,
      message: 'Revisá los campos en Publicación y acta.',
      fieldErrors: zodFieldErrors(pubParsed.error),
    }
  }

  const colParsed = z.array(expedienteBatchColRowSchema).safeParse(colindantes)
  const titParsed = z.array(titRowSchema).safeParse(titulos)
  if (!colParsed.success) {
    return {
      ok: false,
      message: 'Datos de colindantes inválidos.',
      fieldErrors: zodFieldErrors(colParsed.error),
    }
  }
  if (!titParsed.success) {
    return {
      ok: false,
      message: 'Datos de títulos inválidos.',
      fieldErrors: zodFieldErrors(titParsed.error),
    }
  }

  const ordParsed = expedienteOrdenantesSchema.safeParse(ordenantes)
  if (!ordParsed.success) {
    return {
      ok: false,
      message: 'Datos de ordenantes inválidos.',
      fieldErrors: zodFieldErrors(ordParsed.error),
    }
  }

  const linderosParsed = linderosSchema.safeParse(linderos)
  if (!linderosParsed.success) {
    return {
      ok: false,
      message: 'Datos de linderos inválidos.',
      fieldErrors: zodFieldErrors(linderosParsed.error),
    }
  }

  const profCheck = await assertExpedienteProfessionalsAllowed(userId, datosParsed.data)
  if (!profCheck.ok) {
    return { ok: false, message: profCheck.message, fieldErrors: profCheck.fieldErrors }
  }

  const d = datosParsed.data
  const pub = pubParsed.data
  const cols = colParsed.data
  const tits = titParsed.data
  const ords = ordParsed.data
  const l = linderosParsed.data

  const actuantesOrdered = d.actuantesIds.map((x) => x.trim()).filter(Boolean)

  const fechaOrdenTrabajoPersist = optTrim(d.fechaOrdenTrabajo)

  const existing = await prisma.expediente.findUnique({
    where: { id: expedienteId },
    select: {
      principalProfessionalId: true,
      secondProfessionalId: true,
      colindantes: { select: { id: true } },
      tituloRelaciones: { select: { id: true } },
      ordenantes: { select: { id: true } },
      linderos: { select: { id: true, puntos: { select: { id: true } } } },
    },
  })

  const { principalProfessionalId, secondProfessionalId } = principalSecondForPersist(
    actuantesOrdered,
    existing
      ? {
          principalProfessionalId: existing.principalProfessionalId,
          secondProfessionalId: existing.secondProfessionalId,
        }
      : null
  )

  const existingColIds = new Set(existing?.colindantes.map((c) => c.id) ?? [])
  const existingTitIds = new Set(existing?.tituloRelaciones.map((t) => t.id) ?? [])
  const existingOrdIds = new Set(existing?.ordenantes.map((o) => o.id) ?? [])
  const existingPuntoIds = new Set(existing?.linderos?.puntos.map((p) => p.id) ?? [])

  const submittedColIds = new Set(cols.filter((c) => c.id).map((c) => c.id!))
  const submittedTitIds = new Set(tits.filter((t) => t.id).map((t) => t.id!))
  const submittedOrdIds = new Set(ords.filter((o) => o.id).map((o) => o.id!))
  const submittedPuntoIds = new Set(l.puntos.filter((p) => p.id).map((p) => p.id!))

  const colToDelete = [...existingColIds].filter((id) => !submittedColIds.has(id))
  const titToDelete = [...existingTitIds].filter((id) => !submittedTitIds.has(id))
  const ordToDelete = [...existingOrdIds].filter((id) => !submittedOrdIds.has(id))
  const puntoToDelete = [...existingPuntoIds].filter((id) => !submittedPuntoIds.has(id))

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
          publicacionEdictoFecha: pub.publicacionEdictoFecha,
          publicacionEdictoNumero: pub.publicacionEdictoNumero,
          boletinOficialNota: pub.boletinOficialNota,
          actaNotarialNumero: pub.actaNotarialNumero,
          actaNotarialFecha: pub.actaNotarialFecha,
          publicacionActaObservaciones: pub.publicacionActaObservaciones,
          lugarReunion: pub.lugarReunion,
          toleranciaActa: pub.toleranciaActa,
          llevPublicacionEdictos: pub.llevPublicacionEdictos,
          medioPublicacion: pub.medioPublicacion,
        },
      })

      await replaceExpedienteActuantes(tx, expedienteId, actuantesOrdered)

      // ─── Colindantes ──────────────────────────────────────────────────
      if (colToDelete.length > 0) {
        await tx.expedienteColindante.deleteMany({ where: { id: { in: colToDelete } } })
      }
      for (let i = 0; i < cols.length; i++) {
        const c = cols[i]!
        const desc = optTrim(c.descripcion)
        const dir = c.dirigidoA.trim()
        const domP = c.domicilioParcelaColindante.trim()
        const domT = c.domicilioTitularColindante.trim()
        const baseData = {
          orden: i,
          distancia: '',
          colindante: c.colindante,
          descripcion: desc,
          notificaA: c.notificaA,
          domicilioParcelaColindante: domP,
          domicilioTitularColindante: domT,
          dirigidoA: dir,
        }
        let colId: string
        if (c.id && existingColIds.has(c.id)) {
          await tx.expedienteColindante.update({
            where: { id: c.id },
            data: baseData,
          })
          colId = c.id
        } else {
          const created = await tx.expedienteColindante.create({
            data: { expedienteId, ...baseData },
            select: { id: true },
          })
          colId = created.id
        }
        await tx.expedienteColindanteNomenclatura.deleteMany({ where: { colindanteId: colId } })
        await tx.expedienteColindanteNomenclatura.createMany({
          data: c.nomenclaturas.map((n, j) => ({
            colindanteId: colId,
            orden: j,
            nomenclatura: n.nomenclatura.trim(),
            rumbo: n.rumbo.trim(),
          })),
        })
      }

      // ─── Títulos (legacy — still processed for backwards compatibility) ─
      if (titToDelete.length > 0) {
        await tx.expedienteTituloRelacion.deleteMany({ where: { id: { in: titToDelete } } })
      }
      for (let i = 0; i < tits.length; i++) {
        const t = tits[i]!
        const obs = optTrim(t.observaciones)
        if (t.id && existingTitIds.has(t.id)) {
          await tx.expedienteTituloRelacion.update({
            where: { id: t.id },
            data: {
              orden: i,
              instrumento: t.instrumento,
              matricula: t.matricula,
              fechaTitulo: t.fechaTitulo,
              observaciones: obs,
            },
          })
        } else {
          await tx.expedienteTituloRelacion.create({
            data: {
              expedienteId,
              orden: i,
              instrumento: t.instrumento,
              matricula: t.matricula,
              fechaTitulo: t.fechaTitulo,
              observaciones: obs,
            },
          })
        }
      }

       // ─── Ordenantes ───────────────────────────────────────────────────
       if (ordToDelete.length > 0) {
         await tx.expedienteOrdenante.deleteMany({ where: { id: { in: ordToDelete } } })
       }
       for (let i = 0; i < ords.length; i++) {
         const o = ords[i]!
         if (o.id && existingOrdIds.has(o.id)) {
           await tx.expedienteOrdenante.update({
             where: { id: o.id },
             data: {
               orden: i,
               nombre: o.nombre,
               documento: o.documento,
               sexo: o.sexo,
               cuit: o.cuit,
               domicilio: o.domicilio,
               caracter: o.caracter,
               esPropietario: o.esPropietario,
             },
           })
         } else {
           await tx.expedienteOrdenante.create({
             data: {
               expedienteId,
               orden: i,
               nombre: o.nombre,
               documento: o.documento,
               sexo: o.sexo,
               cuit: o.cuit,
               domicilio: o.domicilio,
               caracter: o.caracter,
               esPropietario: o.esPropietario,
             },
           })
         }
       }

      // ─── Linderos (upsert) ────────────────────────────────────────────
      const linderoData = {
        superficieTotal: l.superficieTotal,
        superficieSegun: l.superficieSegun,
        fechaRelacionTitulos: l.fechaRelacionTitulos,
        observacionesGenerales: l.observacionesGenerales,
      }
      const linderosSaved = await tx.expedienteLinderos.upsert({
        where: { expedienteId },
        create: { expedienteId, ...linderoData },
        update: linderoData,
        select: { id: true },
      })

      // ─── Puntos de lindero ────────────────────────────────────────────
      if (puntoToDelete.length > 0) {
        await tx.expedienteLinderoPunto.deleteMany({ where: { id: { in: puntoToDelete } } })
      }
      for (let i = 0; i < l.puntos.length; i++) {
        const p = l.puntos[i]!
        if (p.id && existingPuntoIds.has(p.id)) {
          await tx.expedienteLinderoPunto.update({
            where: { id: p.id },
            data: {
              orden: i,
              tipo: p.tipo,
              direccion: p.direccion,
              descripcion: p.descripcion,
              medida: p.medida,
            },
          })
        } else {
          await tx.expedienteLinderoPunto.create({
            data: {
              linderosId: linderosSaved.id,
              orden: i,
              tipo: p.tipo,
              direccion: p.direccion,
              descripcion: p.descripcion,
              medida: p.medida,
            },
          })
        }
      }
    })
  } catch (err) {
    console.error('updateExpedienteFull error:', err)
    return { ok: false, message: 'No se pudo guardar. Intentá de nuevo.' }
  }

  revalidatePath(`/expedientes/${expedienteId}`)
  return { ok: true, message: 'Expediente guardado correctamente.' }
}
