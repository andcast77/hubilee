import { describe, expect, it } from 'vitest'
import {
  buildOrdenTrabajoMandateBody,
  formatOrdenanteClause,
  joinOrdenantesList,
  mcpFraseDos,
  mcpPhraseUno,
  ORDEN_TRABAJO_VIGENCIA_TEXT,
} from '@/lib/expediente/docx/orden-trabajo-text'
import { makeOrdenanteDto, makeOrdenTrabajoFixture, makeProfesionalDto } from './fixtures'

describe('ORDEN_TRABAJO_VIGENCIA_TEXT', () => {
  it('contiene la cláusula completa de vigencia esperada', () => {
    expect(ORDEN_TRABAJO_VIGENCIA_TEXT).toContain('vigencia')
    expect(ORDEN_TRABAJO_VIGENCIA_TEXT).toContain('Mandato')
    expect(ORDEN_TRABAJO_VIGENCIA_TEXT).toContain('Profesional')
    expect(ORDEN_TRABAJO_VIGENCIA_TEXT).toContain('Direcci')
  })
})

describe('formatOrdenanteClause', () => {
  it('null cuando no hay nombre', () => {
    expect(
      formatOrdenanteClause(makeOrdenanteDto({ nombre: '   ' }))
    ).toBeNull()
  })

  it('compone DNI / CUIT / domicilio / carácter en orden estable', () => {
    const out = formatOrdenanteClause(
      makeOrdenanteDto({
        nombre: 'Maria Lopez',
        documento: '11223344',
        cuit: '27-11223344-0',
        domicilio: 'Av. Sarmiento 200, Capital',
        caracter: 'titular',
      })
    )
    expect(out).toBe(
      'Maria Lopez, DNI 11223344, CUIT/CUIL 27-11223344-0, con domicilio real en Av. Sarmiento 200, Capital, en carácter de titular'
    )
  })
})

describe('joinOrdenantesList', () => {
  it('vacío cuando no hay claúsulas', () => {
    expect(joinOrdenantesList([])).toBe('')
  })

  it('una claúsula se devuelve tal cual', () => {
    expect(joinOrdenantesList(['Maria Lopez'])).toBe('Maria Lopez')
  })

  it('dos claúsulas: separa con "; y/e" según fonética', () => {
    expect(joinOrdenantesList(['Maria Lopez', 'Pedro Soto'])).toContain(
      'Maria Lopez; y Pedro Soto'
    )
    expect(joinOrdenantesList(['Maria Lopez', 'Ignacio Soto'])).toContain(
      'Maria Lopez; e Ignacio Soto'
    )
  })

  it('tres+ claúsulas: usa coma de Oxford con conjunción al final', () => {
    expect(joinOrdenantesList(['A', 'B', 'C'])).toBe('A; B; y C')
  })
})

describe('mcpPhraseUno / mcpFraseDos', () => {
  it('mcpPhraseUno vacío cuando no hay número', () => {
    expect(mcpPhraseUno('')).toBe('')
    expect(mcpPhraseUno('1234')).toContain('Matrícula del Colegio Profesional')
    expect(mcpPhraseUno('1234')).toContain('1234')
  })

  it('mcpFraseDos consolida ambos cuando ambos profesionales tienen MCP', () => {
    const a = makeProfesionalDto({ mcp: '1111' })
    const b = makeProfesionalDto({ mcp: '2222' })
    const out = mcpFraseDos(a, b)
    expect(out).toContain('1111')
    expect(out).toContain('2222')
    expect(out).toContain('respectivamente')
  })

  it('mcpFraseDos delega a mcpPhraseUno cuando sólo uno tiene MCP', () => {
    const a = makeProfesionalDto({ mcp: '1111' })
    const b = makeProfesionalDto({ mcp: '' })
    expect(mcpFraseDos(a, b)).toContain('1111')
    expect(mcpFraseDos(a, b)).not.toContain('respectivamente')
  })
})

describe('buildOrdenTrabajoMandateBody', () => {
  it('un solo profesional, sin co-titulares: prefijo "Por la presente ORDEN DE TRABAJO,"', () => {
    const data = makeOrdenTrabajoFixture({
      ordenantes: [],
      principal: makeProfesionalDto({ displayName: 'Juan Perez', tituloEs: 'Agrimensor' }),
      segundo: null,
    })
    const out = buildOrdenTrabajoMandateBody(data)
    expect(out.startsWith('Por la presente ORDEN DE TRABAJO,')).toBe(true)
    expect(out).toContain('Juan Perez')
    expect(out).toContain('declara estar habilitado')
    expect(out).toContain('quien declara')
  })

  it('dos profesionales: usa "quienes declaran" plural', () => {
    const data = makeOrdenTrabajoFixture({
      principal: makeProfesionalDto({ displayName: 'Juan Perez' }),
      segundo: makeProfesionalDto({ displayName: 'Ana Garcia' }),
    })
    const out = buildOrdenTrabajoMandateBody(data)
    expect(out).toContain('Juan Perez')
    expect(out).toContain('Ana Garcia')
    expect(out).toContain('quienes declaran estar habilitados')
  })

  it('co-titular único: lo menciona antes del Mandato', () => {
    const data = makeOrdenTrabajoFixture({
      ordenantes: [makeOrdenanteDto({ nombre: 'Maria Lopez' })],
      principal: makeProfesionalDto({ displayName: 'Juan Perez' }),
    })
    const out = buildOrdenTrabajoMandateBody(data)
    expect(out).toContain('Maria Lopez')
    expect(out).toContain('confiere el Mandato')
  })

  it('parcial agrega frase entre paréntesis', () => {
    const data = makeOrdenTrabajoFixture({ parcial: true })
    const out = buildOrdenTrabajoMandateBody(data)
    expect(out).toContain('(parcial)')
  })

  it('sin ubicación de parcela, usa fallback "provincia de San Juan"', () => {
    const data = makeOrdenTrabajoFixture({ parcelaUbicacionLinea: '' })
    const out = buildOrdenTrabajoMandateBody(data)
    expect(out).toContain('provincia de San Juan')
    expect(out).not.toContain('ubicada en calle')
  })
})
