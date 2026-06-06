import { describe, expect, it } from 'vitest'
import {
  sanitizeDniInput,
  derivarCuit,
  normalizeNomenclaturaCatastral,
  formatNomenclaturaCatastralInput,
  NOMENCLATURA_CATASTRAL_REGEX,
  departamentoNombreFromNomenclaturaCatastral,
} from '@/lib/format'

// ─── sanitizeDniInput ───────────────────────────────────────────────────────

describe('sanitizeDniInput', () => {
  it('deja solo dígitos', () => {
    expect(sanitizeDniInput('12.345.678')).toBe('12345678')
  })

  it('descarta letras', () => {
    expect(sanitizeDniInput('12abc34')).toBe('1234')
  })

  it('recorta al máximo de 8 dígitos', () => {
    expect(sanitizeDniInput('123456789')).toBe('12345678')
  })

  it('devuelve vacío si no hay dígitos', () => {
    expect(sanitizeDniInput('abc')).toBe('')
  })

  it('acepta string vacío', () => {
    expect(sanitizeDniInput('')).toBe('')
  })
})

// ─── derivarCuit ────────────────────────────────────────────────────────────

describe('derivarCuit', () => {
  it('deriva CUIT masculino', () => {
    const result = derivarCuit('12345678', 'Masculino')
    expect(result).toMatch(/^20-\d{8}-\d$/)
  })

  it('deriva CUIT femenino', () => {
    const result = derivarCuit('12345678', 'Femenino')
    expect(result).toMatch(/^27-\d{8}-\d$/)
  })

  it('siempre devuelve formato XX-XXXXXXXX-X', () => {
    const m = derivarCuit('12345678', 'Masculino')!.match(/^(\d{2})-(\d{8})-(\d)$/)
    expect(m).not.toBeNull()
    const prefix = Number(m![1])
    // 20 (masculino), 27 (femenino) o 23 (fallback dígito 10)
    expect([20, 23]).toContain(prefix)
  })

  it('devuelve null para sexo X', () => {
    expect(derivarCuit('12345678', 'X')).toBeNull()
  })

  it('devuelve null para sexo vacío', () => {
    expect(derivarCuit('12345678', '')).toBeNull()
  })

  it('devuelve null para DNI vacío', () => {
    expect(derivarCuit('', 'Masculino')).toBeNull()
  })

  it('devuelve null para DNI con más de 8 dígitos', () => {
    expect(derivarCuit('123456789', 'Masculino')).toBeNull()
  })
})

// ─── normalizeNomenclaturaCatastral ─────────────────────────────────────────

describe('normalizeNomenclaturaCatastral', () => {
  it('normaliza formato canónico', () => {
    expect(normalizeNomenclaturaCatastral('01-05/001234')).toBe('01-05/001234')
  })

  it('inserta guión entre departamento y sección', () => {
    expect(normalizeNomenclaturaCatastral('0105/001234')).toBe('01-05/001234')
  })

  it('normaliza caracteres fullwidth', () => {
    expect(normalizeNomenclaturaCatastral('０１－０５／００１２３４')).toBe('01-05/001234')
  })

  it('normaliza guiones largos', () => {
    expect(normalizeNomenclaturaCatastral('01—05/001234')).toBe('01-05/001234')
  })

  it('devuelve vacío para null', () => {
    expect(normalizeNomenclaturaCatastral(null as unknown as string)).toBe('')
  })

  it('devuelve vacío para string vacío', () => {
    expect(normalizeNomenclaturaCatastral('')).toBe('')
  })
})

// ─── formatNomenclaturaCatastralInput ───────────────────────────────────────

describe('formatNomenclaturaCatastralInput', () => {
  it('formatea entrada parcial: primeros dos dígitos', () => {
    expect(formatNomenclaturaCatastralInput('01')).toBe('01')
  })

  it('formatea 4 dígitos: agrega guión', () => {
    expect(formatNomenclaturaCatastralInput('0105')).toBe('01-05')
  })

  it('formatea 5+ dígitos: agrega guión y slash', () => {
    expect(formatNomenclaturaCatastralInput('0105001')).toBe('01-05/001')
  })

  it('descarta no dígitos', () => {
    expect(formatNomenclaturaCatastralInput('01-05/001')).toBe('01-05/001')
  })

  it('recorta a 12 dígitos', () => {
    expect(formatNomenclaturaCatastralInput('0105001234567')).toBe('01-05/00123456')
  })
})

// ─── NOMENCLATURA_CATASTRAL_REGEX ──────────────────────────────────────────

describe('NOMENCLATURA_CATASTRAL_REGEX', () => {
  it('acepta formato válido', () => {
    expect(NOMENCLATURA_CATASTRAL_REGEX.test('01-05/001234')).toBe(true)
  })

  it('acepta departamento 19 (Valle Fértil)', () => {
    expect(NOMENCLATURA_CATASTRAL_REGEX.test('19-10/123')).toBe(true)
  })

  it('rechaza departamento 00', () => {
    expect(NOMENCLATURA_CATASTRAL_REGEX.test('00-05/001234')).toBe(false)
  })

  it('rechaza departamento 20', () => {
    expect(NOMENCLATURA_CATASTRAL_REGEX.test('20-05/001234')).toBe(false)
  })

  it('rechaza sin slash', () => {
    expect(NOMENCLATURA_CATASTRAL_REGEX.test('01-05001234')).toBe(false)
  })
})

// ─── departamentoNombreFromNomenclaturaCatastral ───────────────────────────

describe('departamentoNombreFromNomenclaturaCatastral', () => {
  it('devuelve "Capital" para código 01', () => {
    expect(departamentoNombreFromNomenclaturaCatastral('01-05/001234')).toBe('Capital')
  })

  it('devuelve "Valle Fértil" para código 19', () => {
    expect(departamentoNombreFromNomenclaturaCatastral('19-10/123456')).toBe('Valle Fértil')
  })

  it('devuelve vacío para código inválido', () => {
    expect(departamentoNombreFromNomenclaturaCatastral('99-10/123456')).toBe('')
  })

  it('devuelve vacío para string vacío', () => {
    expect(departamentoNombreFromNomenclaturaCatastral('')).toBe('')
  })
})
