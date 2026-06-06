import { describe, expect, it } from 'vitest'
import { DNI_INPUT_MAX_DIGITS, sanitizeDniInput } from '@/lib/format'

describe('sanitizeDniInput', () => {
  it('elimina letras y caracteres no numéricos', () => {
    expect(sanitizeDniInput('30.123.456')).toBe('30123456')
    expect(sanitizeDniInput('abc30123456xyz')).toBe('30123456')
  })

  it(`recorta a ${DNI_INPUT_MAX_DIGITS} dígitos`, () => {
    expect(sanitizeDniInput('123456789012')).toBe('12345678')
  })
})
