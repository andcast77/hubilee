/**
 * Conjunciones coordinantes españolas:
 * - Copulativa «e»/«y»: {@link españolYoE}.
 * - Disyuntiva «u»/«o»: {@link españolOu}.
 */

function stripAccentMarks(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

/** Primera grafía léxica (tras quitar algunos marcadores típicos de cita). */
function primeraPalabraSiguiente(siguiente: string): string {
  const trimmed = siguiente.trimStart()
  if (!trimmed) return ''
  const match = /\S+/.exec(trimmed)
  const token = (match?.[0] ?? '').replace(/^[(«"']+/u, '')
  return token
}

/** True si tras la primera grafía viene consonante típica (no vocal). */
function isConsonantLike(c: string | undefined): boolean {
  return !!c && /[bcçdfghjklmnñpqrstvwxyz]/i.test(stripAccentMarks(c))
}

/**
 * Siguiente unión léxica (normalmente siguiente palabra o frase tras la conjunción).
 * @returns `'e'` ante `hi-/hí-…` y `i-+consonante` (p. ej. «hijos», «Ignacio», «iglú»);
 *          `'y'` ante léxicos en `idea-…`; grafías profesionales `ingeniero/…`.
 */
export function españolYoE(siguiente: string): 'y' | 'e' {
  const primera = primeraPalabraSiguiente(siguiente)
  if (!primera.length) return 'y'

  const s = stripAccentMarks(primera).toLowerCase()

  if (/^hi/.test(s)) return 'e'

  if (/^i/.test(s)) {
    if (s.startsWith('ingeniero')) return 'y'
    /** Léxicos con hiato habitual (`ideas`, `ideario`, …) — mantienen «y». */
    if (/^idea/.test(s)) return 'y'
    if (isConsonantLike(s[1])) return 'e'
  }

  return 'y'
}

/**
 * Disyuntiva: «u» ante `ho-` y palabras inicial `o`/«ó», para evitar golpes de fonema /o/
 * («siete u ocho», «autor u obra»…); en otro caso «o».
 */
export function españolOu(siguiente: string): 'o' | 'u' {
  const primera = primeraPalabraSiguiente(siguiente)
  if (!primera.length) return 'o'

  const s = stripAccentMarks(primera).toLowerCase()

  if (/^ho/.test(s)) return 'u'
  if (/^o/.test(s)) return 'u'

  return 'o'
}
