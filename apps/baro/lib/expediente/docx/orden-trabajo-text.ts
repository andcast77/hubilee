/**
 * Text builders para `orden-trabajo`.
 *
 * Consumido desde el renderer DOCX. Sólo strings: sin dependencia de `docx`.
 */

import { españolYoE } from './español-conj-y-e'
import type {
  OrdenTrabajoOrdenanteDto,
  OrdenTrabajoProfesionalDto,
  OrdenTrabajoRenderData,
} from './document-render-data'

const COLEGIO_MCP_PREFIJO = ' con Matrícula del Colegio Profesional de Ingenieros Agrimensores Nº '

/** Vigencia legal estable para el cuerpo de la orden de trabajo. */
export const ORDEN_TRABAJO_VIGENCIA_TEXT =
  'El presente Mandato mantendrá su vigencia mientras no sea expresamente revocado y comunicado fehacientemente su revocación al Profesional y a la Dirección de Geodesia y Catastro.'

function t(s: string | null | undefined): string {
  return (s ?? '').trim()
}

export function formatOrdenanteClause(o: OrdenTrabajoOrdenanteDto): string | null {
  const name = t(o.nombre)
  if (!name) return null
  let s = name
  const dni = t(o.documento)
  const cuit = t(o.cuit)
  const dom = t(o.domicilio)
  const car = t(o.caracter)
  if (dni) s += `, DNI ${dni}`
  if (cuit) s += `, CUIT/CUIL ${cuit}`
  if (dom) s += `, con domicilio real en ${dom}`
  if (car) s += `, en carácter de ${car}`
  return s
}

export function joinOrdenantesList(clauses: string[]): string {
  if (clauses.length === 0) return ''
  if (clauses.length === 1) return clauses[0] ?? ''
  if (clauses.length === 2) {
    const b = clauses[1] ?? ''
    return `${clauses[0]}; ${españolYoE(b)} ${b}`
  }
  const head = clauses.slice(0, -1).join('; ')
  const last = clauses[clauses.length - 1] ?? ''
  return `${head}; ${españolYoE(last)} ${last}`
}

export function mcpPhraseUno(num: string): string {
  return num ? `${COLEGIO_MCP_PREFIJO}${num}` : ''
}

export function mcpFraseDos(a: OrdenTrabajoProfesionalDto, b: OrdenTrabajoProfesionalDto): string {
  const ma = t(a.mcp)
  const mb = t(b.mcp)
  if (ma && mb) return `${COLEGIO_MCP_PREFIJO}${ma} ${españolYoE(mb)} ${mb} respectivamente`
  if (ma) return mcpPhraseUno(ma)
  if (mb) return mcpPhraseUno(mb)
  return ''
}

/**
 * Construye el cuerpo narrativo (texto plano) del mandato. El layout vive en el renderer DOCX.
 */
export function buildOrdenTrabajoMandateBody(data: OrdenTrabajoRenderData): string {
  const clauses = data.ordenantes
    .map(formatOrdenanteClause)
    .filter((x): x is string => x !== null && x.length > 0)
  const prefOrdenantes = joinOrdenantesList(clauses)
  const segunda = data.segundo

  const parcialFrase = data.parcial ? ' (parcial)' : ''
  const ubic = t(data.parcelaUbicacionLinea)
  const ubicacionFrase = ubic
    ? `, ubicada en calle ${ubic} provincia de San Juan`
    : ', provincia de San Juan'

  const tipoText = t(data.tipoMensuraLabel)
  const tipoTrabajoMayus = tipoText.toUpperCase()
  const nom = t(data.nomenclaturaCatastral)

  let profeRest = ''
  const dirPrincipal = t(data.principal.direccionEstudioLinea)

  if (!segunda) {
    const t0 = t(data.principal.tituloEs)
    const n0 = t(data.principal.displayName)
    const mcpP = mcpPhraseUno(t(data.principal.mcp))
    const dirPart = dirPrincipal ? `, con domicilio en ${dirPrincipal}` : ''
    profeRest = `del profesional`
    profeRest += t0 ? ` ${t0}` : ''
    profeRest += ` ${n0}${dirPart}, quien declara estar habilitado${mcpP}`
    profeRest += `, para que realice el trabajo de ${tipoTrabajoMayus} de la parcela nomenclatura catastral ${nom}${parcialFrase}${ubicacionFrase}.`
  } else {
    const ta = t(data.principal.tituloEs)
    const na = t(data.principal.displayName)
    const tb = t(segunda.tituloEs)
    const nb = t(segunda.displayName)
    const dirPart = dirPrincipal ? `, con domicilio en ${dirPrincipal}` : ''
    const mcps = mcpFraseDos(data.principal, segunda)
    profeRest = `de los profesionales`
    profeRest += ta ? ` ${ta}` : ''
    const segundoNome = [tb, nb]
      .map(t)
      .filter((x) => x.length > 0)
      .join(' ')
    profeRest += ` ${na} ${españolYoE(segundoNome)} ${segundoNome}${dirPart}, quienes declaran estar habilitados${mcps}`
    profeRest += `, para que realicen el trabajo de ${tipoTrabajoMayus} de la parcela nomenclatura catastral ${nom}${parcialFrase}${ubicacionFrase}.`
  }

  const introHead = prefOrdenantes
    ? `Por la presente ORDEN DE TRABAJO, ${prefOrdenantes}, confiere el Mandato con Representación a favor `
    : `Por la presente ORDEN DE TRABAJO, confiere el Mandato con Representación a favor `

  return `${introHead}${profeRest}`
}
