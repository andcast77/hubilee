/**
 * Schemas Zod y parsers FormData del expediente.
 */

import { z } from 'zod'
import {
  ACTA_NOTARIAL_FECHA_FORMAT_HINT,
  formatActaNotarialFechaDdMmYyyyHhMm,
  parseActaNotarialFechaToDate,
} from '@/lib/expediente/acta-notarial-fecha'
import { DNI_DIGITS_PATTERN } from '@/lib/format'
import { zNomenclaturaCatastral, zNomenclaturaCatastralOpcional } from '@/lib/format'
import { EXPEDIENTE_MAX_ACTUANTES } from '@/lib/expediente/ui-shell'
import { isObjetoExpedienteId } from '@/lib/expediente/catalogs'
import { DOMINIO_INSCRIPCION, MEMORIA_TEXTO } from '@/lib/expediente/digesto-fields'

// ─── ordenantes ─────────────────────────────────────────────────────────────

export const expedienteOrdenanteRowSchema = z.object({
   id: z.string().nullable().optional(),
   nombre: z.string().trim().min(1, 'El nombre del ordenante es obligatorio.'),
   documento: z
     .string()
     .trim()
     .min(1, 'El DNI del ordenante es obligatorio.')
     .regex(DNI_DIGITS_PATTERN, 'El DNI solo puede incluir números (hasta 8 dígitos).'),
   sexo: z.string().trim().min(1, 'El sexo del ordenante es obligatorio.'),
   cuit: z.string().trim().min(1, 'El CUIT del ordenante es obligatorio.').max(20),
   domicilio: z.string().trim().min(1, 'El domicilio del ordenante es obligatorio.').max(500),
   caracter: z.string().trim().min(1, 'El carácter del ordenante es obligatorio.'),
   esPropietario: z.boolean().default(false),
 })

export const expedienteOrdenantesSchema = z.array(expedienteOrdenanteRowSchema)

export type ExpedienteOrdenanteRowInput = z.infer<typeof expedienteOrdenanteRowSchema>

// ─── linderos ───────────────────────────────────────────────────────────────

const ALLOWED_DIRECTIONS = {
  CARDINAL: ['Norte', 'Sur', 'Este', 'Oeste'],
  ESPECIAL: ['Noreste', 'Noroeste', 'Sureste', 'Suroeste'],
} as const

export const linderoPuntoSchema = z.object({
  id: z.string().nullable().optional(),
  tipo: z.enum(['CARDINAL', 'ESPECIAL']),
  direccion: z.string().trim().min(1, 'La dirección del punto es obligatoria.'),
  descripcion: z.string().trim().default(''),
  medida: z.string().trim().default(''),
})

export const linderosSchema = z
  .object({
    id: z.string().nullable().optional(),
    superficieTotal: z.string().trim().default(''),
    superficieSegun: z.string().trim().default(''),
    fechaRelacionTitulos: z.string().trim().default(''),
    observacionesGenerales: z.string().trim().default(''),
    puntos: z.array(linderoPuntoSchema).superRefine((puntos, ctx) => {
      const seen = new Map<string, number>()
      puntos.forEach((p, idx) => {
        const key = `${p.tipo}::${p.direccion}`
        if (seen.has(key)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [idx, 'direccion'],
            message: `La dirección ${p.direccion} ya fue usada en este grupo.`,
          })
        } else {
          seen.set(key, idx)
        }
        const allowed = ALLOWED_DIRECTIONS[p.tipo as 'CARDINAL' | 'ESPECIAL']
        if (!allowed.includes(p.direccion as never)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [idx, 'direccion'],
            message: `Dirección inválida para tipo ${p.tipo}.`,
          })
        }
      })
    }),
  })
  .strict()

export type LinderosInput = z.infer<typeof linderosSchema>
export type LinderoPuntoInput = z.infer<typeof linderoPuntoSchema>

// ─── colindantes ────────────────────────────────────────────────────────────

/** Notificación prevista (comunicación de mensura), alineado a práctica tipo ManagerDoc. */
export const COLINDANTE_NOTIFICA_VALUES = ['Particular', 'Fiscalía', 'Ente'] as const
export type ColindanteNotifica = (typeof COLINDANTE_NOTIFICA_VALUES)[number]

/** Una fila de nomenclatura + cardinal dentro de un colindante (puede haber varias por el mismo lote). */
export const expedienteBatchColNomenclaturaRowSchema = z.object({
  id: z.string().nullable().optional(),
  nomenclatura: zNomenclaturaCatastralOpcional,
  rumbo: z.string().trim().default(''),
})

export type ExpedienteBatchColNomenclaturaRowInput = z.infer<
  typeof expedienteBatchColNomenclaturaRowSchema
>

export const expedienteBatchColRowSchema = z.object({
  id: z.string().nullable().optional(),
  colindante: z.string().trim().min(1, 'El titular es obligatorio.'),
  descripcion: z.string().nullable().optional().default(null),
  notificaA: z.enum(COLINDANTE_NOTIFICA_VALUES).default('Particular'),
  nomenclaturas: z
    .array(expedienteBatchColNomenclaturaRowSchema)
    .min(1, 'Cada colindante debe tener al menos una nomenclatura con cardinal.'),
  domicilioParcelaColindante: z.string().trim().default(''),
  domicilioTitularColindante: z.string().trim().default(''),
  dirigidoA: z.string().trim().default(''),
})

export type ExpedienteBatchColRowInput = z.infer<typeof expedienteBatchColRowSchema>

export const expedienteColindanteCreateSchema = z.object({
  expedienteId: z.string().trim().min(1, 'Falta el identificador del expediente.'),
  colindante: z.string().trim().min(1, 'El colindante es obligatorio.'),
  descripcion: z
    .union([z.string(), z.null()])
    .transform((s) => (s === null ? null : s.trim() || null)),
  notificaA: z.enum(COLINDANTE_NOTIFICA_VALUES).optional().default('Particular'),
  nomenclaturas: z.array(expedienteBatchColNomenclaturaRowSchema).min(1),
  domicilioParcelaColindante: z.string().trim().optional().default(''),
  domicilioTitularColindante: z.string().trim().optional().default(''),
  dirigidoA: z.string().trim().optional().default(''),
})

export type ExpedienteColindanteCreateInput = z.infer<typeof expedienteColindanteCreateSchema>

export function parseExpedienteColindanteCreateFormData(fd: FormData): Record<string, unknown> {
  const descripcionRaw = fd.get('descripcion')
  return {
    expedienteId: (fd.get('expedienteId') ?? '').toString(),
    colindante: (fd.get('colindante') ?? '').toString(),
    descripcion:
      descripcionRaw === null || descripcionRaw === undefined ? null : descripcionRaw.toString(),
    notificaA: fd.has('notificaA') ? (fd.get('notificaA') ?? '').toString() : undefined,
    nomenclaturas: [
      {
        nomenclatura: (fd.get('nomenclatura') ?? '').toString(),
        rumbo: (fd.get('rumbo') ?? '').toString(),
      },
    ],
    domicilioParcelaColindante: fd.has('domicilioParcelaColindante')
      ? (fd.get('domicilioParcelaColindante') ?? '').toString()
      : undefined,
    domicilioTitularColindante: fd.has('domicilioTitularColindante')
      ? (fd.get('domicilioTitularColindante') ?? '').toString()
      : undefined,
    dirigidoA: fd.has('dirigidoA') ? (fd.get('dirigidoA') ?? '').toString() : undefined,
  }
}

export const expedienteColindanteUpdateSchema = z
  .object({
    id: z.string().trim().min(1, 'Falta el identificador del colindante.'),
    distancia: z.string().trim().optional(),
    colindante: z
      .string()
      .trim()
      .optional()
      .refine((val) => val === undefined || val.length > 0, {
        message: 'El colindante es obligatorio.',
      }),
    descripcion: z
      .union([z.string(), z.null()])
      .optional()
      .transform((s) => (s === undefined ? undefined : s === null ? null : s.trim() || null)),
    notificaA: z.enum(COLINDANTE_NOTIFICA_VALUES).optional(),
    domicilioParcelaColindante: z.string().trim().optional(),
    domicilioTitularColindante: z.string().trim().optional(),
    dirigidoA: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    const hasChange =
      data.colindante !== undefined ||
      data.descripcion !== undefined ||
      data.notificaA !== undefined ||
      data.domicilioParcelaColindante !== undefined ||
      data.domicilioTitularColindante !== undefined ||
      data.dirigidoA !== undefined
    if (!hasChange) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Nada para actualizar.',
      })
    }
  })

export type ExpedienteColindanteUpdateInput = z.infer<typeof expedienteColindanteUpdateSchema>

export const expedienteColindanteDeleteSchema = z.object({
  id: z.string().trim().min(1, 'Falta el identificador del colindante.'),
})

export type ExpedienteColindanteDeleteInput = z.infer<typeof expedienteColindanteDeleteSchema>

export function parseExpedienteColindanteUpdateFormData(fd: FormData): Record<string, unknown> {
  const descripcionRaw = fd.get('descripcion')
  const raw: Record<string, unknown> = {
    id: (fd.get('colindanteId') ?? '').toString(),
  }
  if (fd.has('colindante')) raw.colindante = (fd.get('colindante') ?? '').toString()
  if (fd.has('descripcion')) {
    raw.descripcion =
      descripcionRaw === null || descripcionRaw === undefined ? null : descripcionRaw.toString()
  }
  if (fd.has('notificaA')) raw.notificaA = (fd.get('notificaA') ?? '').toString()
  if (fd.has('domicilioParcelaColindante')) {
    raw.domicilioParcelaColindante = (fd.get('domicilioParcelaColindante') ?? '').toString()
  }
  if (fd.has('domicilioTitularColindante')) {
    raw.domicilioTitularColindante = (fd.get('domicilioTitularColindante') ?? '').toString()
  }
  if (fd.has('dirigidoA')) raw.dirigidoA = (fd.get('dirigidoA') ?? '').toString()
  return raw
}

export function parseExpedienteColindanteDeleteFormData(fd: FormData): Record<string, unknown> {
  return { id: (fd.get('colindanteId') ?? '').toString() }
}

// ─── título relación ────────────────────────────────────────────────────────

export const expedienteTituloRelacionCreateSchema = z.object({
  expedienteId: z.string().trim().min(1, 'Falta el identificador del expediente.'),
  instrumento: z.string().trim().min(1, 'El instrumento o acto es obligatorio.'),
  matricula: z.string().trim(),
  fechaTitulo: z.string().trim(),
  observaciones: z
    .union([z.string(), z.null()])
    .transform((s) => (s === null ? null : s.trim() || null)),
})

export type ExpedienteTituloRelacionCreateInput = z.infer<
  typeof expedienteTituloRelacionCreateSchema
>

export function parseExpedienteTituloRelacionCreateFormData(fd: FormData): Record<string, unknown> {
  const observacionesRaw = fd.get('observaciones')
  return {
    expedienteId: (fd.get('expedienteId') ?? '').toString(),
    instrumento: (fd.get('instrumento') ?? '').toString(),
    matricula: (fd.get('matricula') ?? '').toString(),
    fechaTitulo: (fd.get('fechaTitulo') ?? '').toString(),
    observaciones:
      observacionesRaw === null || observacionesRaw === undefined
        ? null
        : observacionesRaw.toString(),
  }
}

export const expedienteTituloRelacionUpdateSchema = z
  .object({
    id: z.string().trim().min(1, 'Falta el identificador del vínculo.'),
    instrumento: z
      .string()
      .trim()
      .optional()
      .refine((val) => val === undefined || val.length > 0, {
        message: 'El instrumento o acto es obligatorio.',
      }),
    matricula: z.string().trim().optional(),
    fechaTitulo: z.string().trim().optional(),
    observaciones: z
      .union([z.string(), z.null()])
      .optional()
      .transform((s) => (s === undefined ? undefined : s === null ? null : s.trim() || null)),
  })
  .superRefine((data, ctx) => {
    const hasChange =
      data.instrumento !== undefined ||
      data.matricula !== undefined ||
      data.fechaTitulo !== undefined ||
      data.observaciones !== undefined
    if (!hasChange) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Nada para actualizar.',
      })
    }
  })

export type ExpedienteTituloRelacionUpdateInput = z.infer<
  typeof expedienteTituloRelacionUpdateSchema
>

export const expedienteTituloRelacionDeleteSchema = z.object({
  id: z.string().trim().min(1, 'Falta el identificador del vínculo.'),
})

export type ExpedienteTituloRelacionDeleteInput = z.infer<
  typeof expedienteTituloRelacionDeleteSchema
>

export function parseExpedienteTituloRelacionUpdateFormData(fd: FormData): Record<string, unknown> {
  const observacionesRaw = fd.get('observaciones')
  const raw: Record<string, unknown> = {
    id: (fd.get('tituloRelacionId') ?? '').toString(),
  }
  if (fd.has('instrumento')) raw.instrumento = (fd.get('instrumento') ?? '').toString()
  if (fd.has('matricula')) raw.matricula = (fd.get('matricula') ?? '').toString()
  if (fd.has('fechaTitulo')) raw.fechaTitulo = (fd.get('fechaTitulo') ?? '').toString()
  if (fd.has('observaciones')) {
    raw.observaciones =
      observacionesRaw === null || observacionesRaw === undefined
        ? null
        : observacionesRaw.toString()
  }
  return raw
}

export function parseExpedienteTituloRelacionDeleteFormData(fd: FormData): Record<string, unknown> {
  return { id: (fd.get('tituloRelacionId') ?? '').toString() }
}

// ─── publicación acta ───────────────────────────────────────────────────────

function lineField(max: number, maxMsg?: string) {
  return z
    .string()
    .max(max, maxMsg ?? `Máximo ${max} caracteres.`)
    .transform((s) => {
      const t = s.trim()
      return t.length === 0 ? null : t
    })
}

const actaNotarialFechaField = z
  .string()
  .max(200, 'Fecha de acta: máximo 200 caracteres.')
  .transform((s) => s.trim())
  .transform((s) => (s.length === 0 ? null : s))
  .superRefine((val, ctx) => {
    if (val === null) return
    if (parseActaNotarialFechaToDate(val) === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Fecha de acta: usá ${ACTA_NOTARIAL_FECHA_FORMAT_HINT} (ej. 06/05/2026 14:30).`,
      })
    }
  })
  .transform((val) => {
    if (val === null) return null
    const d = parseActaNotarialFechaToDate(val)!
    return formatActaNotarialFechaDdMmYyyyHhMm(d)
  })

export const expedientePublicacionActaUpdateSchema = z.object({
  expedienteId: z.string().trim().min(1, 'Falta el identificador del expediente.'),
  publicacionEdictoFecha: lineField(200),
  publicacionEdictoNumero: lineField(500),
  boletinOficialNota: lineField(500),
  actaNotarialNumero: lineField(500),
  actaNotarialFecha: actaNotarialFechaField,
  publicacionActaObservaciones: lineField(10_000),
  lugarReunion: lineField(500),
  toleranciaActa: lineField(200),
  llevPublicacionEdictos: z.coerce.boolean().default(false),
  medioPublicacion: lineField(200),
})

export type ExpedientePublicacionActaUpdateInput = z.infer<
  typeof expedientePublicacionActaUpdateSchema
>

export function parseExpedientePublicacionActaFormData(fd: FormData): Record<string, unknown> {
  return {
    expedienteId: (fd.get('expedienteId') ?? '').toString(),
    publicacionEdictoFecha: (fd.get('publicacionEdictoFecha') ?? '').toString(),
    publicacionEdictoNumero: (fd.get('publicacionEdictoNumero') ?? '').toString(),
    boletinOficialNota: (fd.get('boletinOficialNota') ?? '').toString(),
    actaNotarialNumero: (fd.get('actaNotarialNumero') ?? '').toString(),
    actaNotarialFecha: (fd.get('actaNotarialFecha') ?? '').toString(),
    publicacionActaObservaciones: (fd.get('publicacionActaObservaciones') ?? '').toString(),
    lugarReunion: (fd.get('lugarReunion') ?? '').toString(),
    toleranciaActa: (fd.get('toleranciaActa') ?? '').toString(),
    llevPublicacionEdictos: (fd.get('llevPublicacionEdictos') ?? 'false').toString(),
    medioPublicacion: (fd.get('medioPublicacion') ?? '').toString(),
  }
}

// ─── nueva expediente + datos generales ─────────────────────────────────────

export const expedienteNuevaSchema = z
  .object({
    actuantesIds: z
      .array(z.string().trim().min(1))
      .max(EXPEDIENTE_MAX_ACTUANTES, `Como máximo ${EXPEDIENTE_MAX_ACTUANTES} actuantes.`),
    objetoExpedienteId: z
      .string()
      .min(1, 'Seleccioná el objeto del expediente.')
      .refine((v) => isObjetoExpedienteId(v), { message: 'Objeto del expediente no válido.' }),
    nomenclaturaCatastral: zNomenclaturaCatastral,
    planoAntecedente: z.string().trim().max(120).optional(),
    loteFraccion: z.string().trim().max(200).optional(),
    domicilioParcela: z.string().trim().max(500).optional(),
    parcial: z.boolean(),
    soloOrdenTrabajo: z.boolean(),
    fechaOrdenTrabajo: z.string().trim().max(20).optional(),
    propietario: z.string().trim().min(1, 'El propietario / titular es obligatorio.'),
    domicilioPropietario: z.string().trim().max(500).optional(),
    inscripcionDominio: z.string().trim().max(DOMINIO_INSCRIPCION.maxLength).optional(),
    naturalezaActo: z.string().trim().max(300).optional(),
    memoriaObservaciones: z.string().max(MEMORIA_TEXTO.maxLength).optional(),
    motivoHidraulica: z.string().max(4000).optional(),
    motivoFiscalia: z.string().max(4000).optional(),
    /** Municipio de la parcela (recomendado en parcela urbana / visación local). */
    municipio: z.string().trim().max(120).optional(),
    /** Indica si el estudio prevé trámite de visación municipal previa a catastro provincial. */
    requiereVisacionMunicipal: z.boolean(),
  })
  .superRefine((data, ctx) => {
    const ids = data.actuantesIds.map((x) => x.trim()).filter(Boolean)
    const uniq = new Set(ids)
    if (uniq.size !== ids.length) {
      ctx.addIssue({
        code: 'custom',
        message: 'No podés repetir actuantes.',
        path: ['actuantesIds'],
      })
    }
  })

export type ExpedienteNuevaInput = z.infer<typeof expedienteNuevaSchema>

function formDataBool(fd: FormData, key: string): boolean {
  const v = fd.get(key)
  return v === 'on' || v === 'true' || v === '1'
}

function formDataStr(fd: FormData, key: string): string {
  return (fd.get(key) ?? '').toString()
}

/** Lee campos de una `FormData` alineados con `expedienteNuevaSchema` (p. ej. server actions). */
export function parseExpedienteNuevaFormData(fd: FormData): Record<string, unknown> {
  const multi = fd.getAll('actuantesIds')
  const actuantesIds =
    multi.length > 0
      ? multi.map((x) => x.toString().trim()).filter(Boolean)
      : (() => {
          const one = fd.get('actuantesIds')
          return one == null ? [] : [one.toString().trim()].filter(Boolean)
        })()

  return {
    actuantesIds,
    objetoExpedienteId: formDataStr(fd, 'objetoExpedienteId'),
    nomenclaturaCatastral: formDataStr(fd, 'nomenclaturaCatastral'),
    planoAntecedente: formDataStr(fd, 'planoAntecedente'),
    loteFraccion: formDataStr(fd, 'loteFraccion'),
    domicilioParcela: formDataStr(fd, 'domicilioParcela'),
    parcial: formDataBool(fd, 'parcial'),
    soloOrdenTrabajo: formDataBool(fd, 'soloOrdenTrabajo'),
    fechaOrdenTrabajo: formDataStr(fd, 'fechaOrdenTrabajo'),
    propietario: formDataStr(fd, 'propietario'),
    domicilioPropietario: formDataStr(fd, 'domicilioPropietario'),
    inscripcionDominio: formDataStr(fd, 'inscripcionDominio'),
    naturalezaActo: formDataStr(fd, 'naturalezaActo'),
    memoriaObservaciones: formDataStr(fd, 'memoriaObservaciones'),
    motivoHidraulica: formDataStr(fd, 'motivoHidraulica'),
    motivoFiscalia: formDataStr(fd, 'motivoFiscalia'),
    municipio: formDataStr(fd, 'municipio'),
    requiereVisacionMunicipal: formDataBool(fd, 'requiereVisacionMunicipal'),
  }
}

export const expedienteDatosGeneralesSchema = expedienteNuevaSchema.safeExtend({
  fechaOrdenTrabajo: z.string().trim().max(20).default(''),
})

export type ExpedienteDatosGeneralesInput = z.infer<typeof expedienteDatosGeneralesSchema>

export function parseExpedienteDatosGeneralesFormData(fd: FormData): Record<string, unknown> {
  const bool = (key: string) => fd.get(key) === 'on' || fd.get(key) === 'true'
  const str = (key: string) => (fd.get(key) ?? '').toString()
  return {
    actuantesIds: fd.getAll('actuantesIds').map(String),
    objetoExpedienteId: str('objetoExpedienteId'),
    nomenclaturaCatastral: str('nomenclaturaCatastral'),
    planoAntecedente: str('planoAntecedente') || undefined,
    loteFraccion: str('loteFraccion') || undefined,
    domicilioParcela: str('domicilioParcela') || undefined,
    parcial: bool('parcial'),
    soloOrdenTrabajo: bool('soloOrdenTrabajo'),
    fechaOrdenTrabajo: str('fechaOrdenTrabajo'),
    propietario: str('propietario'),
    domicilioPropietario: str('domicilioPropietario') || undefined,
    inscripcionDominio: str('inscripcionDominio') || undefined,
    naturalezaActo: str('naturalezaActo') || undefined,
    memoriaObservaciones: str('memoriaObservaciones') || undefined,
    motivoHidraulica: str('motivoHidraulica') || undefined,
    motivoFiscalia: str('motivoFiscalia') || undefined,
    municipio: str('municipio') || undefined,
    requiereVisacionMunicipal: bool('requiereVisacionMunicipal'),
  }
}
