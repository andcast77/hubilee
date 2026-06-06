/**
 * Helpers engine-agnostic para mapear rumbos textuales a cardinales y
 * formatear listas de cardinales (Norte / Sur / Este / Oeste). Usado
 * por los renderers DOCX, por lo que NO importa nada de la librería `docx`.
 *
 * Originalmente vivía en `lib/expediente/docx/render-utils.ts`. Extraído
 * como módulo independiente para evitar cargar la librería `docx` desde utilidades compartidas.
 */

function trimOrEmpty(value: string | null | undefined): string {
  return (value ?? '').trim()
}

export type Cardinal = 'Norte' | 'Sur' | 'Este' | 'Oeste'

/**
 * Mapea un rumbo textual a uno de los 4 cardinales. Tolerante a
 * abreviaciones simples (`N`, `S-`, `e ...`, etc.) y a contenido extra
 * después del cardinal. Devuelve `null` si no reconoce el rumbo.
 *
 * Orden de checks: `oeste` antes de `este` (la cadena `oeste` contiene
 * `este` como substring; revisar primero el más específico evita el
 * falso positivo histórico que mapeaba "Oeste" a "Este").
 */
export function cardinalFromRumbo(rumbo: string): Cardinal | null {
  const raw = trimOrEmpty(rumbo).toLocaleLowerCase('es-AR')
  if (!raw) return null
  if (raw.includes('norte') || /^n(?:\b|[-\s])/i.test(raw)) return 'Norte'
  if (raw.includes('sur') || /^s(?:\b|[-\s])/i.test(raw)) return 'Sur'
  if (raw.includes('oeste') || /^o(?:\b|[-\s])/i.test(raw)) return 'Oeste'
  if (raw.includes('este') || /^e(?:\b|[-\s])/i.test(raw)) return 'Este'
  return null
}

/**
 * Formatea una lista de rumbos como cardinales únicos en orden N/S/E/O,
 * separados por coma + "y" final ("Norte y Sur", "Norte, Sur y Este").
 * Devuelve string vacío si no se reconoce ningún cardinal.
 */
export function formatCardinalesColindantes(rumbos: string[]): string {
  const cardinalOrder: Cardinal[] = ['Norte', 'Sur', 'Este', 'Oeste']
  const found = new Set<Cardinal>()

  for (const rumbo of rumbos) {
    const cardinal = cardinalFromRumbo(rumbo)
    if (cardinal) found.add(cardinal)
  }

  const list = cardinalOrder.filter((c) => found.has(c))
  if (list.length === 0) return ''
  if (list.length === 1) return list[0] ?? ''
  if (list.length === 2) return `${list[0]} y ${list[1]}`
  const last = list[list.length - 1] ?? ''
  return `${list.slice(0, -1).join(', ')} y ${last}`
}
