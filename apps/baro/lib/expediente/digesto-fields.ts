/**
 * Alcance funcional del módulo de expedientes respecto del circuito catastral en San Juan.
 * No sustituye asesoramiento legal; enlaces oficiales para verificación.
 */

export type ExpedienteOutputScope = 'internal' | 'dgc_pack'

/** Modo por defecto: expediente interno del estudio (borrador, sin paquete sellado DGC). */
export function getExpedienteOutputScope(): ExpedienteOutputScope {
  const raw = process.env.NEXT_PUBLIC_EXPEDIENTE_OUTPUT_SCOPE?.trim().toLowerCase()
  if (raw === 'dgc_pack') return 'dgc_pack'
  return 'internal'
}

export function isDgcPackEnabled(): boolean {
  return getExpedienteOutputScope() === 'dgc_pack'
}

export const EXPEDIENTE_SAN_JUAN_LINKS = {
  dgc: 'https://catastro.sanjuan.gob.ar/',
  registracionPlanos: 'https://tramite.sanjuan.gob.ar/tramite/d/412/registracion-de-planos',
  consultasWeb: 'http://servicioscatastro.sanjuan.gob.ar/dgcconsultasweb',
  rentasUt: 'https://rentas.dgrsj.gob.ar/DatosContribuyente/Servicios',
  digestoEjemplo: 'https://servicioscatastro.sanjuan.gob.ar/digestodgc/VerNorma.php?NormaId=935',
} as const

/**
 * Reglas y textos de ayuda alineados al digesto / manual técnico de la DGC San Juan.
 * La validación estricta de planos y memoria depende de la normativa vigente; aquí se fijan
 * límites razonables para UI y borradores de expediente interno.
 */

export const NOMENCLATURA_CATASTRAL = {
  /** DD-SS/NNNNNN = 2+1+2+1+hasta8 = 14 chars máximo */
  maxLength: 14,
  /**
   * Formato canónico DGC San Juan: DD-SS/NNNNNN
   *   DD = departamento (01–19), SS = sección (2 dígitos), NNNNNN = parcela (variable).
   */
  patternDescription:
    'Nomenclatura DGC San Juan: DD-SS/NNNNNN — ej. 01-05/001234. Solo dígitos; el guión y la barra se insertan automáticamente.',
  invalidMessage:
    'Nomenclatura inválida. Formato esperado: DD-SS/NNNNNN (ej. 01-05/001234), donde DD es el código de departamento (01–19).',
  docLink: EXPEDIENTE_SAN_JUAN_LINKS.digestoEjemplo,
} as const

export const MEMORIA_TEXTO = {
  maxLength: 12_000,
  note: 'Memoria descriptiva y observaciones: contenido técnico para legajo; revisar exigencias del digesto DGC y del colegio profesional provincial.',
} as const

export const DOMINIO_INSCRIPCION = {
  maxLength: 512,
  note: 'Inscripción de dominio: matrícula / referencia registral según partida o instrucción del escribano.',
} as const
