import { españolOu, españolYoE } from '@/lib/expediente/docx/español-conj-y-e'
import { describe, expect, it } from 'vitest'

describe('españolOu', () => {
  it('«u» ante ho-… (Honor, hormigonado…)', () => {
    expect(españolOu('Honor')).toBe('u')
    expect(españolOu('hormigonado')).toBe('u')
  })

  it('«u» ante palabras que empiezan en o-', () => {
    expect(españolOu('ocho')).toBe('u')
    expect(españolOu('Octubre siguiente')).toBe('u')
    expect(españolOu('Óscar Pérez')).toBe('u')
  })

  it('«o» cuando no hay choque habitual de /o/', () => {
    expect(españolOu('Historia universal')).toBe('o')
    expect(españolOu('usado')).toBe('o')
    expect(españolOu('Argentina')).toBe('o')
  })

  it('vacío → «o»', () => {
    expect(españolOu('')).toBe('o')
    expect(españolOu('   ')).toBe('o')
  })
})

describe('españolYoE', () => {
  it('«e» antes de hi-', () => {
    expect(españolYoE('hijos')).toBe('e')
    expect(españolYoE('Historia del arte')).toBe('e')
  })

  it('«e» ante i-+consonante (excepto grafías «ingeniero…»)', () => {
    expect(españolYoE('Ignacio López')).toBe('e')
    expect(españolYoE('Íñigo Urreaga')).toBe('e')
    expect(españolYoE('Inglaterra')).toBe('e')
    expect(españolYoE('Ingeniero Agrim')).toBe('y')
    expect(españolYoE('Ingeniero/a Agrim')).toBe('y')
  })

  it('«y» ante léxicos en idea-', () => {
    expect(españolYoE('ideas nuevas')).toBe('y')
    expect(españolYoE('ideario jurídico')).toBe('y')
  })

  it('«e» ante i-+consonante dentro de lexemas largos', () => {
    expect(españolYoE('instrumentación')).toBe('e')
  })

  it('vacío → «y»', () => {
    expect(españolYoE('')).toBe('y')
    expect(españolYoE('   ')).toBe('y')
  })
})
