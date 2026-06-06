import { describe, expect, it } from 'vitest'
import { derivarCuit } from '@/lib/format'

describe('derivarCuit', () => {
  it('no asume género: sin sexo válido no devuelve CUIT', () => {
    expect(derivarCuit('30123456', '')).toBeNull()
    expect(derivarCuit('30123456', '  ')).toBeNull()
  })

  it('X no deriva', () => {
    expect(derivarCuit('30123456', 'X')).toBeNull()
  })

  it('Masculino y Femenino derivan con formato esperado', () => {
    const m = derivarCuit('30123456', 'Masculino')
    const f = derivarCuit('30123456', 'Femenino')
    expect(m).toMatch(/^20-\d{8}-\d$/)
    expect(f).toMatch(/^27-\d{8}-\d$/)
    expect(m).not.toBe(f)
  })
})
