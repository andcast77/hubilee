import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('Pos shop-user admin copy (source)', () => {
  it('UserList primary labels use usuarios de la tienda / código de usuario', () => {
    const src = readFileSync(
      resolve(__dirname, '../../components/features/users/UserList.tsx'),
      'utf8',
    )
    expect(src).toContain('Código de usuario')
    expect(src).toContain('No hay usuarios de la tienda')
    expect(src).not.toMatch(/Código empleado|contraseña de piso|Personal de piso|códigos de piso/)
  })

  it('UserForm labels código de usuario (not empleado/piso)', () => {
    const src = readFileSync(
      resolve(__dirname, '../../components/features/users/UserForm.tsx'),
      'utf8',
    )
    expect(src).toContain('Código de usuario:')
    expect(src).not.toMatch(/Código de empleado|códigos de piso/)
  })
})
