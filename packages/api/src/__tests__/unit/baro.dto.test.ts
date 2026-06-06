import { describe, it, expect } from 'vitest'
import { createBaroExpedienteSchema } from '../../dto/baro.dto.js'

describe('createBaroExpedienteSchema (check-structure PR2)', () => {
  const valid = {
    objetoExpedienteId: 'obj-1',
    nomenclaturaCatastral: '01-02-03',
    propietario: 'Juan Pérez',
    principalProfessionalId: '550e8400-e29b-41d4-a716-446655440000',
  }

  it('accepts minimal valid payload', () => {
    const r = createBaroExpedienteSchema.safeParse(valid)
    expect(r.success).toBe(true)
  })

  it('accepts optional secondProfessionalId', () => {
    const r = createBaroExpedienteSchema.safeParse({
      ...valid,
      secondProfessionalId: '550e8400-e29b-41d4-a716-446655440001',
    })
    expect(r.success).toBe(true)
  })

  it('rejects empty propietario', () => {
    const r = createBaroExpedienteSchema.safeParse({ ...valid, propietario: '   ' })
    expect(r.success).toBe(false)
  })

  it('rejects invalid principalProfessionalId uuid', () => {
    const r = createBaroExpedienteSchema.safeParse({
      ...valid,
      principalProfessionalId: 'not-a-uuid',
    })
    expect(r.success).toBe(false)
  })
})
