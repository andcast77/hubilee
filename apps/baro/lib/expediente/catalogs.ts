/**
 * Catálogos de UI / dominio del expediente (ordenante, objeto de mensura).
 */

/** Etiquetas persistidas en `ExpedienteOrdenante.sexo`. */
export const ORDENANTE_SEXO_OPTIONS = ['Masculino', 'Femenino', 'X'] as const

export type OrdenanteSexoLabel = (typeof ORDENANTE_SEXO_OPTIONS)[number]

export const ORDENANTE_SEXO_LABEL_SET = new Set<string>(ORDENANTE_SEXO_OPTIONS)

/**
 * Carácter del ordenante — alineado al catálogo de referencia (ids solo documentación).
 * En DB persistimos la etiqueta visible (`ExpedienteOrdenante.caracter`), no el id numérico.
 */
export const ORDENANTE_CARACTER_CATALOG = [
  { id: '16', label: 'Adjudicatario' },
  { id: '7', label: 'Administrador Fiduciario' },
  { id: '6', label: 'Apoderado' },
  { id: '10', label: 'Cesionario' },
  { id: '3', label: 'Comprador' },
  { id: '12', label: 'Comprador en Subasta Pública' },
  { id: '4', label: 'Condómino' },
  { id: '9', label: 'Director' },
  { id: '8', label: 'Donatario' },
  { id: '2', label: 'Heredero' },
  { id: '5', label: 'Poseedor' },
  { id: '11', label: 'Presidente' },
  { id: '1', label: 'Propietario' },
  { id: '14', label: 'Socio Gerente' },
  { id: '15', label: 'Usufructuario' },
] as const

/** Etiquetas en el mismo orden que el catálogo fuente (para el `<select>`). */
export const ORDENANTE_CARACTER_OPTIONS: readonly string[] = ORDENANTE_CARACTER_CATALOG.map(
  (x) => x.label
)

export const ORDENANTE_CARACTER_LABEL_SET = new Set(ORDENANTE_CARACTER_OPTIONS)

/**
 * Catálogo «Objeto del expediente»: ids estables en BD (`objetoExpedienteId`) y etiquetas
 * alineadas al listado oficial de “objeto de mensura” del circuito catastral (misma redacción que el trámite de referencia).
 */

export type ObjetoExpedienteId =
  | 'cabida_unica'
  | 'subdiv_26994_ph_edificio'
  | 'judicial'
  | 'servidumbre'
  | 'expropiacion'
  | 'reg_dominio_1808_c'
  | 'titulo_dominio_24320'
  | 'titulo_dominio_166_c'
  | 'usucapion'
  | 'cabida_unica_y_division'
  | 'cabida_unica_division_expropiacion'
  | 'cabida_unica_division_conjunto_inmobiliario'
  | 'replanteos_e_integracion'
  | 'replanteos_para_integracion'
  | 'replanteos_para_integracion_y_division'
  | 'replanteos_y_division_anexion'
  | 'replanteos_integracion_y_division'
  | 'verificacion_estado_parcelario'

export type ObjetoExpedienteOption = {
  id: ObjetoExpedienteId
  /** Texto mostrado en UI e impresos si se usa la etiqueta canónica del catálogo. */
  label: string
}

/**
 * Orden igual al desplegable de referencia del trámite (objeto de mensura).
 */
export const OBJETO_EXPEDIENTE_OPTIONS: readonly ObjetoExpedienteOption[] = [
  { id: 'cabida_unica', label: 'Mensura' },
  {
    id: 'subdiv_26994_ph_edificio',
    label: 'Mensura de Subdivisión para someter al régimen de propiedad horizontal',
  },
  { id: 'judicial', label: 'Mensura Judicial' },
  { id: 'servidumbre', label: 'Mensura para constituir servidumbre' },
  { id: 'expropiacion', label: 'Mensura para expropiación' },
  {
    id: 'reg_dominio_1808_c',
    label: 'Mensura para regularizar dominio según Ley Prov. N°1808-C',
  },
  {
    id: 'titulo_dominio_24320',
    label: 'Mensura para tramitar título de dominio por Ley Nac. 24.320',
  },
  {
    id: 'titulo_dominio_166_c',
    label: 'Mensura para tramitar título de dominio por Ley Prov. 166-C',
  },
  { id: 'usucapion', label: 'Mensura para usucapión' },
  { id: 'cabida_unica_y_division', label: 'Mensura y división' },
  { id: 'cabida_unica_division_expropiacion', label: 'Mensura y división para expropiación' },
  {
    id: 'cabida_unica_division_conjunto_inmobiliario',
    label:
      'Mensura y división para someter al Régimen de CONJUNTO INMOBILIARIO el edificio Construido.',
  },
  { id: 'replanteos_e_integracion', label: 'mensuras e Integración' },
  { id: 'replanteos_para_integracion', label: 'mensuras para Integración' },
  { id: 'replanteos_para_integracion_y_division', label: 'Mensuras para integración y División' },
  { id: 'replanteos_y_division_anexion', label: 'Mensuras y división para Anexión.' },
  { id: 'replanteos_integracion_y_division', label: 'mensuras, Integración y División' },
  { id: 'verificacion_estado_parcelario', label: 'Verificación del estado parcelario' },
] as const

const byId = new Map(OBJETO_EXPEDIENTE_OPTIONS.map((o) => [o.id, o]))

export function getObjetoExpedienteById(id: string): ObjetoExpedienteOption | undefined {
  return byId.get(id as ObjetoExpedienteId)
}

export function isObjetoExpedienteId(value: string): value is ObjetoExpedienteId {
  return byId.has(value as ObjetoExpedienteId)
}
