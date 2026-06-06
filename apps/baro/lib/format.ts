import { z } from 'zod'
import { NOMENCLATURA_CATASTRAL } from '@/lib/expediente/digesto-fields'

/** Máximo de dígitos admitidos en los campos DNI de la UI (alinea con `derivarCuit`). */
export const DNI_INPUT_MAX_DIGITS = 8

/** Patrón para validar DNI ya normalizado (solo dígitos, 1–8). */
export const DNI_DIGITS_PATTERN = new RegExp(`^\\d{1,${DNI_INPUT_MAX_DIGITS}}$`)

/** Deja solo dígitos y recorta al máximo permitido. */
export function sanitizeDniInput(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, DNI_INPUT_MAX_DIGITS)
}

/**
 * Deriva el CUIT/CUIL a partir del DNI y el sexo de la persona.
 *
 * Prefijos:
 *   20 → Masculino
 *   27 → Femenino
 *   23 → fallback cuando el dígito verificador resulta 10
 *
 * Género X: no se auto-deriva (devuelve null).
 *
 * Formato de salida: "XX-XXXXXXXX-X"
 *
 * Devuelve `null` si el DNI no es válido, el sexo no está definido (`''`),
 * no es `Masculino` ni `Femenino`, o es `X` (no se asume un género por defecto).
 */
export function derivarCuit(dni: string, sexo: string): string | null {
  const dniNumeros = dni.replace(/\D/g, '')
  if (!dniNumeros || dniNumeros.length > 8) return null
  if (sexo !== 'Masculino' && sexo !== 'Femenino') return null

  const dniPadded = dniNumeros.padStart(8, '0')

  const prefixPorSexo = sexo === 'Masculino' ? '20' : '27'

  const calcVerificador = (prefix: string): number => {
    const base = `${prefix}${dniPadded}`
    const serie = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
    const suma = base.split('').reduce((acc, d, i) => acc + Number(d) * serie[i], 0)
    const resto = suma % 11
    return resto === 0 ? 0 : 11 - resto
  }

  let prefix = prefixPorSexo
  let verif = calcVerificador(prefix)

  if (verif === 10) {
    prefix = '23'
    verif = calcVerificador(prefix)
  }

  if (verif === 11) verif = 0

  return `${prefix}-${dniPadded}-${verif}`
}

/**
 * Nomenclatura Catastral DGC San Juan — formato canónico:
 *
 *   DD-SS/NNNNNN
 *
 *   DD     = Departamento (01–19)
 *   SS     = Sección catastral (2 dígitos)
 *   /      = Separador fijo
 *   NNNNNN = Número de parcela (variable; generalmente 6 dígitos)
 *
 *   Ejemplo: 01-05/001234  (Dept 01 Capital · Sección 05 · Parcela 001234)
 *
 * Departamentos de San Juan (01–19):
 *   01 Capital · 02 Rivadavia · 03 Santa Lucía · 04 Rawson · 05 Pocito
 *   06 Zonda · 07 Ullum · 08 Chimbas · 09 9 de Julio · 10 Albardón · 11 Angaco
 *   12 San Martín · 13 Caucete · 14 25 de Mayo · 15 Sarmiento · 16 Calingasta
 *   17 Iglesia · 18 Jáchal · 19 Valle Fértil
 */
export const NOMENCLATURA_CATASTRAL_REGEX = /^(?:0[1-9]|1[0-9])-\d{2}\/\d+$/

/** Nombre del departamento según los dos primeros dígitos de la nomenclatura DGC San Juan (01–19). */
export const SAN_JUAN_DEPARTAMENTO_NOMBRE: Readonly<Record<string, string>> = {
  '01': 'Capital',
  '02': 'Rivadavia',
  '03': 'Santa Lucía',
  '04': 'Rawson',
  '05': 'Pocito',
  '06': 'Zonda',
  '07': 'Ullum',
  '08': 'Chimbas',
  '09': '9 de Julio',
  '10': 'Albardón',
  '11': 'Angaco',
  '12': 'San Martín',
  '13': 'Caucete',
  '14': '25 de Mayo',
  '15': 'Sarmiento',
  '16': 'Calingasta',
  '17': 'Iglesia',
  '18': 'Jáchal',
  '19': 'Valle Fértil',
}

/**
 * Obtiene el nombre del departamento a partir de la nomenclatura (DD-SS/NNNNNN).
 * Usa solo el código DD tras normalizar. Si no se puede determinar, devuelve cadena vacía.
 */
export function departamentoNombreFromNomenclaturaCatastral(raw: string): string {
  const n = normalizeNomenclaturaCatastral(raw)
  const m = /^(\d{2})-\d{2}\//.exec(n)
  if (!m) return ''
  const code = m[1]
  return SAN_JUAN_DEPARTAMENTO_NOMBRE[code] ?? ''
}

/**
 * Normaliza texto al formato canónico DD-SS/NNNNNN.
 * Acepta variantes sin guión (DDSS/NNNNNN → DD-SS/NNNNNN).
 */
export function normalizeNomenclaturaCatastral(raw: string): string {
  if (raw == null || raw === '') return ''
  let s = String(raw).normalize('NFKC').trim()
  s = s.replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
  s = s.replace(/\uFF0F/g, '/')
  s = s.replace(/[\u2212\u2010\u2011\u2012\u2013\u2014\u2015\uFE58\uFE63\uFF0D\u30FC]/g, '-')
  s = s.replace(/[.,;:_·]/g, '-')
  s = s.replace(/\s+/g, '')
  s = s.toUpperCase()
  s = s.replace(/[^0-9/-]/g, '')
  s = s.replace(/-+/g, '-')
  s = s.replace(/\/+/g, '/')
  s = s.replace(/^[/-]+|[/-]+$/g, '')
  // Convierte DDSS/NNNNNN → DD-SS/NNNNNN si falta el guión
  s = s.replace(/^(\d{2})(\d{2})\//, '$1-$2/')
  return s
}

/**
 * Formatea la entrada del usuario en tiempo real al patrón DD-SS/NNNNNN.
 * - Descarta todo lo que no sea dígito.
 * - Inserta `-` después del 2.º dígito y `/` después del 4.º.
 * - Longitud máxima del segmento de parcela: flexible (hasta 12 dígitos totales).
 *
 * Uso en onChange: e.target.value = formatNomenclaturaCatastralInput(e.target.value)
 */
export function formatNomenclaturaCatastralInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 12)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}/${digits.slice(4)}`
}

export const zNomenclaturaCatastral = z
  .string()
  .transform((s) => normalizeNomenclaturaCatastral(s))
  .pipe(
    z
      .string()
      .min(1, 'La nomenclatura catastral es obligatoria.')
      .max(NOMENCLATURA_CATASTRAL.maxLength, 'Nomenclatura demasiado larga.')
      .regex(NOMENCLATURA_CATASTRAL_REGEX, NOMENCLATURA_CATASTRAL.invalidMessage)
  )

/** Nomenclatura opcional (colindantes): vacío permitido; si hay texto, mismo criterio que expediente. */
export const zNomenclaturaCatastralOpcional = z
  .string()
  .default('')
  .transform((s) => {
    const t = (s ?? '').trim()
    if (t === '') return ''
    return normalizeNomenclaturaCatastral(t)
  })
  .superRefine((val, ctx) => {
    if (val === '') return
    if (val.length > NOMENCLATURA_CATASTRAL.maxLength) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Nomenclatura demasiado larga.' })
      return
    }
    if (!NOMENCLATURA_CATASTRAL_REGEX.test(val)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: NOMENCLATURA_CATASTRAL.invalidMessage })
    }
  })
