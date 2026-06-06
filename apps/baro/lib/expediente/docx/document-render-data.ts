/**
 * Snapshots Prisma → DTO para renderers .docx (orden de trabajo, acta, edicto, etc.).
 */

import type {
  Professional,
  ProfessionalRegistration,
  ProfessionalTitle,
  Prisma,
  TitleGrammarGender,
} from '@prisma/client'

import { getObjetoExpedienteById } from '@/lib/expediente/catalogs'
import {
  pickRepresentativeRegistration,
  sexoToGrammarGender,
} from '@/lib/professional/registration-pick'

// ═══ orden de trabajo (base profesional / ordenantes) ═══════════════════════

export type OrdenTrabajoOrdenanteDto = {
   orden: number
   nombre: string
   /** DNI — vacío ⇒ no imprime ese bloque. */
   documento: string
   sexo: string
   cuit: string
   domicilio: string
   caracter: string
   esPropietario: boolean
 }

export type OrdenTrabajoProfesionalDto = {
  displayName: string
  tituloEs: string
  mcp: string
  cuit: string
  dni: string
  /** Dirección para párrafo del mandato (principal). */
  direccionEstudioLinea: string
  direccionConsultasLinea: string
  celularLinea: string
  correoLinea: string
  horarioLinea: string
}

/** Entrada estable para `renderOrdenDeTrabajo` (snapshot sin Prisma). */
export type OrdenTrabajoRenderData = {
  fechaOrdenTrabajoLinea: string
  ordenantes: OrdenTrabajoOrdenanteDto[]
  principal: OrdenTrabajoProfesionalDto
  segundo: OrdenTrabajoProfesionalDto | null
  tipoMensuraLabel: string
  nomenclaturaCatastral: string
  parcial: boolean
  parcelaUbicacionLinea: string
}

const ordenTrabajoInclude = {
  ordenantes: { orderBy: { orden: 'asc' as const } },
  principalProfessional: {
    include: {
      registrations: { orderBy: { createdAt: 'asc' } },
    },
  },
  secondProfessional: {
    include: {
      registrations: { orderBy: { createdAt: 'asc' } },
    },
  },
} satisfies Prisma.ExpedienteInclude

export type ExpedienteOrdenTrabajoQueryRow = Prisma.ExpedienteGetPayload<{
  include: typeof ordenTrabajoInclude
}>

export const expedienteOrdenTrabajoFindArgs = {
  include: ordenTrabajoInclude,
} satisfies Prisma.ExpedienteFindFirstArgs

export function professionalTitleEs(title: ProfessionalTitle, grammar: TitleGrammarGender): string {
  const fem = grammar === 'FEMENINO'
  switch (title) {
    case 'AGRIMENSOR':
      return fem ? 'Agrimensora' : 'Agrimensor'
    case 'INGENIERO_AGRIMENSOR':
      return fem ? 'Ingeniera Agrimensora' : 'Ingeniero Agrimensor'
    default:
      return ''
  }
}

export function formatProfesionalDireccionConsultas(p: Professional): string {
  const ln1 = p.addressLine1.trim()
  const ln2 = (p.addressLine2?.trim() ?? '') || ''
  const loc = p.locality.trim()
  const pc = (p.postalCode?.trim() ?? '') || ''
  const prov = p.province.trim() || 'San Juan'
  const street = [ln1, ln2].filter(Boolean).join(', ')
  const core = [street, loc].filter(Boolean).join(', ')
  const withCp = pc ? (core ? `${core} (${pc})` : pc) : core
  const body = withCp ? `${withCp}, provincia de ${prov}` : `provincia de ${prov}`
  return body.trim()
}

/** Una sola línea corta para el cuerpo: domicilio actuante (principal). */
export function formatProfesionalDireccionMandato(p: Professional): string {
  const full = formatProfesionalDireccionConsultas(p)
  return full
}

/** Regla MCP / matrícula representativa (San Juan + más antigua). */
export function pickMcpLicenseNumber(registrations: ProfessionalRegistration[]): string {
  return pickRepresentativeRegistration(registrations)?.licenseNumber.trim() ?? ''
}

/** `Professional` del cliente Prisma incluye `professionalTitle`; el cruce asegura tipado hasta regenerar el cliente. */
export type ProfesionalWithRegistrations = Professional & {
  professionalTitle: ProfessionalTitle
  registrations: ProfessionalRegistration[]
}

/** Include fragment reutilizable en cualquier query que necesite datos del profesional. */
export const profesionalConRegistracionesInclude = {
  include: { registrations: { orderBy: { createdAt: 'asc' as const } } },
} as const

/** Mapea una fila Professional + registrations al DTO de firma/mandato. */
export function mapProfesionalToDto(p: ProfesionalWithRegistrations): OrdenTrabajoProfesionalDto {
  return mapProfesional(p)
}

function mapProfesional(p: ProfesionalWithRegistrations): OrdenTrabajoProfesionalDto {
  const reg = pickRepresentativeRegistration(p.registrations)
  const mcp = reg?.licenseNumber.trim() ?? ''
  const tituloEs = professionalTitleEs(p.professionalTitle, sexoToGrammarGender(p.sexo))
  const cuit = (p.cuit?.trim() ?? '') || ''
  const phone = (p.phone?.trim() ?? '') || ''
  const wa = (p.whatsapp?.trim() ?? '') || ''
  const cel = phone || wa
  const mail = (p.professionalEmail?.trim() ?? '') || ''
  const dni = (p.dni?.trim() ?? '') || ''
  return {
    displayName: p.displayName.trim(),
    tituloEs,
    mcp,
    cuit,
    dni,
    direccionEstudioLinea: formatProfesionalDireccionMandato(p),
    direccionConsultasLinea: formatProfesionalDireccionConsultas(p),
    celularLinea: cel,
    correoLinea: mail,
    horarioLinea: '',
  }
}

function mapOrdenantes(row: ExpedienteOrdenTrabajoQueryRow): OrdenTrabajoOrdenanteDto[] {
   return row.ordenantes.map((o) => ({
     orden: o.orden,
     nombre: o.nombre.trim(),
     documento: o.documento.trim(),
     sexo: o.sexo.trim(),
     cuit: o.cuit.trim(),
     domicilio: o.domicilio.trim(),
     caracter: o.caracter.trim(),
     esPropietario: o.esPropietario,
   }))
 }

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const

/**
 * Fecha desde `YYYY-MM-DD`: `D de mes de AAAA`
 * (día y año numéricos, mes en palabras — se antepone `San Juan, ` en `buildFechaLine`).
 *
 * Exportada para tests.
 */
export function formatOrdenTrabajoFechaNumeroyLetra(fechaYYYYMMDD: string): string | null {
  const trimmed = fechaYYYYMMDD.trim()
  const bits = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!bits) return null

  const yNum = Number(bits[1])
  const mNum = Number(bits[2])
  const dNum = Number(bits[3])

  if (yNum === 0 || mNum < 1 || mNum > 12 || dNum < 1 || dNum > 31) return null

  const probe = new Date(Date.UTC(yNum, mNum - 1, dNum))
  if (
    probe.getUTCFullYear() !== yNum ||
    probe.getUTCMonth() !== mNum - 1 ||
    probe.getUTCDate() !== dNum
  ) {
    return null
  }

  const mesTxt = MESES[mNum - 1]
  if (!mesTxt) return null

  return `${dNum} de ${mesTxt} de ${yNum}`
}

function buildFechaLine(fechaOrdenTrabajo: string | null): string {
  const t = (fechaOrdenTrabajo?.trim() ?? '') || ''
  if (!t) return 'San Juan'
  const numeroyLetra = formatOrdenTrabajoFechaNumeroyLetra(t)
  return numeroyLetra ? `San Juan, ${numeroyLetra}` : `San Juan, ${t}`
}

function buildParcelaUbicacion(domicilioParcela: string | null): string {
  return (domicilioParcela?.trim() ?? '') || ''
}

/**
 * Convierte fila Prisma (con include `expedienteOrdenTrabajoFindArgs`) al DTO del renderer.
 * No valida `soloOrdenTrabajo` — el caller decide.
 */
export function expedienteRowToOrdenTrabajoRenderData(
  row: ExpedienteOrdenTrabajoQueryRow
): OrdenTrabajoRenderData {
  const objetoLabel = (getObjetoExpedienteById(row.objetoExpedienteId)?.label ?? '').trim()
  const tipoMensuraLabel =
    objetoLabel.length > 0 ? objetoLabel : row.objetoExpedienteId.replace(/_/g, ' ')
  return {
    fechaOrdenTrabajoLinea: buildFechaLine(row.fechaOrdenTrabajo),
    ordenantes: mapOrdenantes(row),
    principal: mapProfesional(row.principalProfessional as ProfesionalWithRegistrations),
    segundo: row.secondProfessional
      ? mapProfesional(row.secondProfessional as ProfesionalWithRegistrations)
      : null,
    tipoMensuraLabel,
    nomenclaturaCatastral: row.nomenclaturaCatastral.trim(),
    parcial: row.parcial,
    parcelaUbicacionLinea: buildParcelaUbicacion(row.domicilioParcela),
  }
}

export const ORDEN_TRABAJO_DOC_ID = 'orden-trabajo' as const

/** Colindantes con nomenclaturas (NC + cardinal) para citación, memoria, edicto. */
const expedienteColindantesParaDocxInclude = {
  orderBy: { orden: 'asc' as const },
  include: {
    nomenclaturas: { orderBy: { orden: 'asc' as const } },
  },
} as const

// ═══ citación colindantes ═══════════════════════════════════════════════════

export type ColindanteNomenclaturaDto = {
  nomenclatura: string
  rumbo: string
}

export type ColindanteDto = {
  id: string
  orden: number
  distancia: string
  colindante: string
  descripcion: string
  notificaA: string
  nomenclaturas: ColindanteNomenclaturaDto[]
  domicilioParcelaColindante: string
  domicilioTitularColindante: string
  dirigidoA: string
}

function mapPrismaColindanteToDto(c: {
  id: string
  orden: number
  distancia: string
  colindante: string
  descripcion: string | null
  notificaA: string
  domicilioParcelaColindante: string
  domicilioTitularColindante: string
  dirigidoA: string
  nomenclaturas: { nomenclatura: string; rumbo: string }[]
}): ColindanteDto {
  return {
    id: c.id,
    orden: c.orden,
    distancia: c.distancia.trim(),
    colindante: c.colindante.trim(),
    descripcion: (c.descripcion?.trim() ?? '') || '',
    notificaA: c.notificaA.trim(),
    nomenclaturas: c.nomenclaturas.map((n) => ({
      nomenclatura: n.nomenclatura.trim(),
      rumbo: n.rumbo.trim(),
    })),
    domicilioParcelaColindante: (c.domicilioParcelaColindante?.trim() ?? '') || '',
    domicilioTitularColindante: (c.domicilioTitularColindante?.trim() ?? '') || '',
    dirigidoA: (c.dirigidoA?.trim() ?? '') || '',
  }
}

export type CitacionRenderData = {
  nomenclaturaCatastral: string
  tipoMensuraLabel: string
  propietario: string
  domicilioParcelaMensurar: string
  parcial: boolean
  inscripcionDominio: string
  lugarReunion: string
  toleranciaActa: string
  /** Línea de lugar y fecha de extensión de la carta, p. ej. `San Juan, 14 de mayo de 2026.` */
  fechaCartaLinea: string
  /** Fragmento para el párrafo del acto: `el día … de … de … a las … horas` */
  fechaHoraInicioMensuraLinea: string
  colindantes: ColindanteDto[]
  principal: OrdenTrabajoProfesionalDto
  segundo: OrdenTrabajoProfesionalDto | null
}

const citacionInclude = {
  colindantes: expedienteColindantesParaDocxInclude,
  principalProfessional: profesionalConRegistracionesInclude,
  secondProfessional: profesionalConRegistracionesInclude,
} satisfies Prisma.ExpedienteInclude

export type ExpedienteCitacionQueryRow = Prisma.ExpedienteGetPayload<{
  include: typeof citacionInclude
}>

export const expedienteCitacionFindArgs = {
  include: citacionInclude,
} satisfies Prisma.ExpedienteFindFirstArgs

export function expedienteRowToCitacionRenderData(
  row: ExpedienteCitacionQueryRow
): CitacionRenderData {
  const objetoLabel = (getObjetoExpedienteById(row.objetoExpedienteId)?.label ?? '').trim()
  const tipoMensuraLabel =
    objetoLabel.length > 0 ? objetoLabel : row.objetoExpedienteId.replace(/_/g, ' ')
  const municipioCarta = (
    row.municipio?.trim() ||
    row.principalProfessional.locality.trim() ||
    'San Juan'
  ).trim()
  const fechaCartaLinea = buildFechaComunicacionMensuraCarta(municipioCarta)
  const fechaHoraInicioMensuraLinea = buildFechaHoraInicioMensuraLinea(row)
  return {
    nomenclaturaCatastral: row.nomenclaturaCatastral.trim(),
    tipoMensuraLabel,
    propietario: row.propietario.trim(),
    domicilioParcelaMensurar: (row.domicilioParcela?.trim() ?? '') || '',
    parcial: row.parcial,
    inscripcionDominio: (row.inscripcionDominio?.trim() ?? '') || '',
    lugarReunion: (row.lugarReunion?.trim() ?? '') || '',
    toleranciaActa: (row.toleranciaActa?.trim() ?? '') || '',
    fechaCartaLinea,
    fechaHoraInicioMensuraLinea,
    colindantes: row.colindantes.map(mapPrismaColindanteToDto),
    principal: mapProfesionalToDto(row.principalProfessional),
    segundo: row.secondProfessional ? mapProfesionalToDto(row.secondProfessional) : null,
  }
}

/** Fecha de la carta al generar (zona San Juan). */
function buildFechaComunicacionMensuraCarta(municipio: string): string {
  const tz = 'America/Argentina/San_Juan'
  const d = new Date()
  const parts = new Intl.DateTimeFormat('es-AR', {
    timeZone: tz,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).formatToParts(d)
  const day = parts.find((p) => p.type === 'day')?.value ?? ''
  const month = (parts.find((p) => p.type === 'month')?.value ?? '').replace(/\.$/, '')
  const year = parts.find((p) => p.type === 'year')?.value ?? ''
  const core = [day, 'de', month, 'de', year].filter(Boolean).join(' ')
  return `${municipio}, ${core}.`
}

function buildFechaHoraInicioMensuraLinea(row: ExpedienteCitacionQueryRow): string {
  const raw = (row.publicacionEdictoFecha?.trim() || row.actaNotarialFecha?.trim() || '').trim()
  if (!raw) {
    return 'el día …………………… de …………………… de ……… a las ……… horas'
  }
  const numeroyLetra = formatOrdenTrabajoFechaNumeroyLetra(raw)
  if (numeroyLetra) return `el día ${numeroyLetra} a las 00:00 horas`
  return `el día ${raw} a las 00:00 horas`
}

// ═══ edicto ═════════════════════════════════════════════════════════════════

export type EdictoRenderData = {
  nomenclaturaCatastral: string
  tipoMensuraLabel: string
  propietario: string
  parcial: boolean
  domicilioParcela: string
  lugarReunion: string
  toleranciaActa: string
  actaNotarialFecha: string
  llevPublicacionEdictos: boolean
  medioPublicacion: string
  publicacionEdictoFecha: string
  principal: OrdenTrabajoProfesionalDto
  segundo: OrdenTrabajoProfesionalDto | null
  colindanteTitular: string
  colindanteNomenclatura: string
}

const edictoInclude = {
  colindantes: expedienteColindantesParaDocxInclude,
  principalProfessional: profesionalConRegistracionesInclude,
  secondProfessional: profesionalConRegistracionesInclude,
} satisfies Prisma.ExpedienteInclude

export type ExpedienteEdictoQueryRow = Prisma.ExpedienteGetPayload<{
  include: typeof edictoInclude
}>

export const expedienteEdictoFindArgs = {
  include: edictoInclude,
} satisfies Prisma.ExpedienteFindFirstArgs

export function expedienteRowToEdictoRenderData(row: ExpedienteEdictoQueryRow): EdictoRenderData {
  const objetoLabel = (getObjetoExpedienteById(row.objetoExpedienteId)?.label ?? '').trim()
  const tipoMensuraLabel =
    objetoLabel.length > 0 ? objetoLabel : row.objetoExpedienteId.replace(/_/g, ' ')
  return {
    nomenclaturaCatastral: row.nomenclaturaCatastral.trim(),
    tipoMensuraLabel,
    propietario: row.propietario.trim(),
    parcial: row.parcial,
    domicilioParcela: (row.domicilioParcela?.trim() ?? '') || '',
    lugarReunion: (row.lugarReunion?.trim() ?? '') || '',
    toleranciaActa: (row.toleranciaActa?.trim() ?? '') || '',
    actaNotarialFecha: (row.actaNotarialFecha?.trim() ?? '') || '',
    llevPublicacionEdictos: row.llevPublicacionEdictos,
    medioPublicacion: (row.medioPublicacion?.trim() ?? '') || '',
    publicacionEdictoFecha: (row.publicacionEdictoFecha?.trim() ?? '') || '',
    principal: mapProfesionalToDto(row.principalProfessional),
    segundo: row.secondProfessional ? mapProfesionalToDto(row.secondProfessional) : null,
    colindanteTitular: (row.colindantes[0]?.colindante?.trim() ?? '') || '',
    colindanteNomenclatura: (row.colindantes[0]?.nomenclaturas ?? [])
      .map((n) => n.nomenclatura.trim())
      .filter(Boolean)
      .join(' · '),
  }
}

// ═══ acta ═══════════════════════════════════════════════════════════════════

/**
 * Snapshot para el .docx del acta.
 * Texto de publicación / acta / edicto: solo columnas que edita el panel «Publicación y acta».
 * NC, objeto de mensura, parcial, propietario e inscripción no están en ese panel pero son necesarios para identificar la parcela en el acta.
 */
export type ActaRenderData = {
  nomenclaturaCatastral: string
  domicilioParcela: string
  tipoMensuraLabel: string
  propietario: string
  inscripcionDominio: string
  parcial: boolean
  publicacionEdictoFecha: string
  publicacionEdictoNumero: string
  boletinOficialNota: string
  medioPublicacion: string
  actaNotarialFecha: string
  lugarReunion: string
  toleranciaActa: string
  publicacionActaObservaciones: string
  llevPublicacionEdictos: boolean
  ordenantes: OrdenTrabajoOrdenanteDto[]
  principal: OrdenTrabajoProfesionalDto
  segundo: OrdenTrabajoProfesionalDto | null
}

const actaInclude = {
  ordenantes: { orderBy: { orden: 'asc' as const } },
  principalProfessional: profesionalConRegistracionesInclude,
  secondProfessional: profesionalConRegistracionesInclude,
} satisfies Prisma.ExpedienteInclude

export type ExpedienteActaQueryRow = Prisma.ExpedienteGetPayload<{
  include: typeof actaInclude
}>

export const expedienteActaFindArgs = {
  include: actaInclude,
} satisfies Prisma.ExpedienteFindFirstArgs

export function expedienteRowToActaRenderData(row: ExpedienteActaQueryRow): ActaRenderData {
  const objetoLabel = (getObjetoExpedienteById(row.objetoExpedienteId)?.label ?? '').trim()
  const tipoMensuraLabel =
    objetoLabel.length > 0 ? objetoLabel : row.objetoExpedienteId.replace(/_/g, ' ')
  return {
    nomenclaturaCatastral: row.nomenclaturaCatastral.trim(),
    domicilioParcela: (row.domicilioParcela?.trim() ?? '') || '',
    tipoMensuraLabel,
    propietario: row.propietario.trim(),
    inscripcionDominio: (row.inscripcionDominio?.trim() ?? '') || '',
    parcial: row.parcial,
    publicacionEdictoFecha: (row.publicacionEdictoFecha?.trim() ?? '') || '',
    publicacionEdictoNumero: (row.publicacionEdictoNumero?.trim() ?? '') || '',
    boletinOficialNota: (row.boletinOficialNota?.trim() ?? '') || '',
    medioPublicacion: (row.medioPublicacion?.trim() ?? '') || '',
    actaNotarialFecha: (row.actaNotarialFecha?.trim() ?? '') || '',
    lugarReunion: (row.lugarReunion?.trim() ?? '') || '',
    toleranciaActa: (row.toleranciaActa?.trim() ?? '') || '',
    publicacionActaObservaciones: (row.publicacionActaObservaciones?.trim() ?? '') || '',
    llevPublicacionEdictos: row.llevPublicacionEdictos,
     ordenantes: row.ordenantes.map((o) => ({
       orden: o.orden,
       nombre: o.nombre.trim(),
       documento: o.documento.trim(),
       sexo: o.sexo.trim(),
       cuit: o.cuit.trim(),
       domicilio: o.domicilio.trim(),
       caracter: o.caracter.trim(),
       esPropietario: o.esPropietario,
     })),
    principal: mapProfesionalToDto(row.principalProfessional),
    segundo: row.secondProfessional ? mapProfesionalToDto(row.secondProfessional) : null,
  }
}

// ═══ relación título ═══════════════════════════════════════════════════════

export type LinderoPuntoDto = {
  orden: number
  tipo: string
  direccion: string
  descripcion: string
  medida: string
}

export type RelacionTituloRenderData = {
  nomenclaturaCatastral: string
  tipoMensuraLabel: string
  propietario: string
  inscripcionDominio: string
  superficieTotal: string
  superficieSegun: string
  fechaRelacionTitulos: string
  observacionesGenerales: string
  puntos: LinderoPuntoDto[]
  principal: OrdenTrabajoProfesionalDto
  segundo: OrdenTrabajoProfesionalDto | null
}

const relacionTituloInclude = {
  principalProfessional: profesionalConRegistracionesInclude,
  secondProfessional: profesionalConRegistracionesInclude,
  linderos: {
    include: { puntos: { orderBy: { orden: 'asc' as const } } },
  },
} satisfies Prisma.ExpedienteInclude

export type ExpedienteRelacionTituloQueryRow = Prisma.ExpedienteGetPayload<{
  include: typeof relacionTituloInclude
}>

export const expedienteRelacionTituloFindArgs = {
  include: relacionTituloInclude,
} satisfies Prisma.ExpedienteFindFirstArgs

export function expedienteRowToRelacionTituloRenderData(
  row: ExpedienteRelacionTituloQueryRow
): RelacionTituloRenderData {
  const objetoLabel = (getObjetoExpedienteById(row.objetoExpedienteId)?.label ?? '').trim()
  const tipoMensuraLabel =
    objetoLabel.length > 0 ? objetoLabel : row.objetoExpedienteId.replace(/_/g, ' ')
  const linderos = row.linderos
  return {
    nomenclaturaCatastral: row.nomenclaturaCatastral.trim(),
    tipoMensuraLabel,
    propietario: row.propietario.trim(),
    inscripcionDominio: (row.inscripcionDominio?.trim() ?? '') || '',
    superficieTotal: linderos?.superficieTotal.trim() ?? '',
    superficieSegun: linderos?.superficieSegun.trim() ?? '',
    fechaRelacionTitulos: linderos?.fechaRelacionTitulos.trim() ?? '',
    observacionesGenerales: linderos?.observacionesGenerales.trim() ?? '',
    puntos: (linderos?.puntos ?? []).map((p) => ({
      orden: p.orden,
      tipo: p.tipo.trim(),
      direccion: p.direccion.trim(),
      descripcion: p.descripcion.trim(),
      medida: p.medida.trim(),
    })),
    principal: mapProfesionalToDto(row.principalProfessional),
    segundo: row.secondProfessional ? mapProfesionalToDto(row.secondProfessional) : null,
  }
}

// ═══ memoria descriptiva ════════════════════════════════════════════════════

export type MemoriaDescriptivaRenderData = {
  nomenclaturaCatastral: string
  tipoMensuraLabel: string
  parcial: boolean
  propietario: string
  domicilioParcela: string
  inscripcionDominio: string
  loteFraccion: string
  planoAntecedente: string
  actaNotarialFecha: string
  memoriaObservaciones: string
  ordenanteNombreCompleto: string
  ordenanteDocumento: string
  ordenanteCuit: string
  ordenanteDomicilio: string
  ordenanteCaracter: string
  publicacionEdictoFecha: string
  medioPublicacion: string
  llevPublicacionEdictos: boolean
  colindantes: ColindanteDto[]
  principal: OrdenTrabajoProfesionalDto
  segundo: OrdenTrabajoProfesionalDto | null
}

const memoriaDescriptivaInclude = {
  colindantes: expedienteColindantesParaDocxInclude,
  ordenantes: { orderBy: { orden: 'asc' as const } },
  principalProfessional: profesionalConRegistracionesInclude,
  secondProfessional: profesionalConRegistracionesInclude,
} satisfies Prisma.ExpedienteInclude

export type ExpedienteMemoriaDescriptivaQueryRow = Prisma.ExpedienteGetPayload<{
  include: typeof memoriaDescriptivaInclude
}>

export const expedienteMemoriaDescriptivaFindArgs = {
  include: memoriaDescriptivaInclude,
} satisfies Prisma.ExpedienteFindFirstArgs

export function expedienteRowToMemoriaDescriptivaRenderData(
  row: ExpedienteMemoriaDescriptivaQueryRow
): MemoriaDescriptivaRenderData {
  const objetoLabel = (getObjetoExpedienteById(row.objetoExpedienteId)?.label ?? '').trim()
  const tipoMensuraLabel =
    objetoLabel.length > 0 ? objetoLabel : row.objetoExpedienteId.replace(/_/g, ' ')
  return {
    nomenclaturaCatastral: row.nomenclaturaCatastral.trim(),
    tipoMensuraLabel,
    parcial: row.parcial,
    propietario: row.propietario.trim(),
    domicilioParcela: (row.domicilioParcela?.trim() ?? '') || '',
    inscripcionDominio: (row.inscripcionDominio?.trim() ?? '') || '',
    loteFraccion: (row.loteFraccion?.trim() ?? '') || '',
    planoAntecedente: (row.planoAntecedente?.trim() ?? '') || '',
    actaNotarialFecha: (row.actaNotarialFecha?.trim() ?? '') || '',
    memoriaObservaciones: (row.memoriaObservaciones?.trim() ?? '') || '',
    ordenanteNombreCompleto: (row.ordenantes[0]?.nombre?.trim() ?? '') || '',
    ordenanteDocumento: (row.ordenantes[0]?.documento?.trim() ?? '') || '',
    ordenanteCuit: (row.ordenantes[0]?.cuit?.trim() ?? '') || '',
    ordenanteDomicilio: (row.ordenantes[0]?.domicilio?.trim() ?? '') || '',
    ordenanteCaracter: (row.ordenantes[0]?.caracter?.trim() ?? '') || '',
    publicacionEdictoFecha: (row.publicacionEdictoFecha?.trim() ?? '') || '',
    medioPublicacion: (row.medioPublicacion?.trim() ?? '') || '',
    llevPublicacionEdictos: row.llevPublicacionEdictos,
    colindantes: row.colindantes.map(mapPrismaColindanteToDto),
    principal: mapProfesionalToDto(row.principalProfessional),
    segundo: row.secondProfessional ? mapProfesionalToDto(row.secondProfessional) : null,
  }
}

// ═══ notas ══════════════════════════════════════════════════════════════════

export type NotaHidraulicaRenderData = {
  nomenclaturaCatastral: string
  tipoMensuraLabel: string
  motivoHidraulica: string
  principal: OrdenTrabajoProfesionalDto
}

const notaHidraulicaInclude = {
  principalProfessional: profesionalConRegistracionesInclude,
} satisfies Prisma.ExpedienteInclude

export type ExpedienteNotaHidraulicaQueryRow = Prisma.ExpedienteGetPayload<{
  include: typeof notaHidraulicaInclude
}>

export const expedienteNotaHidraulicaFindArgs = {
  include: notaHidraulicaInclude,
} satisfies Prisma.ExpedienteFindFirstArgs

export function expedienteRowToNotaHidraulicaRenderData(
  row: ExpedienteNotaHidraulicaQueryRow
): NotaHidraulicaRenderData {
  const objetoLabel = (getObjetoExpedienteById(row.objetoExpedienteId)?.label ?? '').trim()
  const tipoMensuraLabel =
    objetoLabel.length > 0 ? objetoLabel : row.objetoExpedienteId.replace(/_/g, ' ')
  return {
    nomenclaturaCatastral: row.nomenclaturaCatastral.trim(),
    tipoMensuraLabel,
    motivoHidraulica: (row.motivoHidraulica?.trim() ?? '') || '',
    principal: mapProfesionalToDto(row.principalProfessional),
  }
}

export type NotaFiscaliaRenderData = {
  nomenclaturaCatastral: string
  tipoMensuraLabel: string
  motivoFiscalia: string
  principal: OrdenTrabajoProfesionalDto
}

const notaFiscaliaInclude = {
  principalProfessional: profesionalConRegistracionesInclude,
} satisfies Prisma.ExpedienteInclude

export type ExpedienteNotaFiscaliaQueryRow = Prisma.ExpedienteGetPayload<{
  include: typeof notaFiscaliaInclude
}>

export const expedienteNotaFiscaliaFindArgs = {
  include: notaFiscaliaInclude,
} satisfies Prisma.ExpedienteFindFirstArgs

export function expedienteRowToNotaFiscaliaRenderData(
  row: ExpedienteNotaFiscaliaQueryRow
): NotaFiscaliaRenderData {
  const objetoLabel = (getObjetoExpedienteById(row.objetoExpedienteId)?.label ?? '').trim()
  const tipoMensuraLabel =
    objetoLabel.length > 0 ? objetoLabel : row.objetoExpedienteId.replace(/_/g, ' ')
  return {
    nomenclaturaCatastral: row.nomenclaturaCatastral.trim(),
    tipoMensuraLabel,
    motivoFiscalia: (row.motivoFiscalia?.trim() ?? '') || '',
    principal: mapProfesionalToDto(row.principalProfessional),
  }
}
