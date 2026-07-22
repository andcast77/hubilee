import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type {
  FloorLoginRequest,
  FloorLoginResponse,
  LoginRequest,
  LoginResponse,
  MeResponse,
} from '@hubilee/contracts'

describe('unified login contracts', () => {
  it('FloorLoginRequest requires userCode + password; captcha optional', () => {
    const required: FloorLoginRequest = {
      userCode: '12345678',
      password: 'floor-secret',
    }
    expect(required.userCode).toBe('12345678')
    expect(required.password).toBe('floor-secret')
    expect(required.captchaToken).toBeUndefined()

    const withCaptcha: FloorLoginRequest = {
      ...required,
      captchaToken: 'turnstile-token',
    }
    expect(withCaptcha.captchaToken).toBe('turnstile-token')
  })

  it('LoginRequest accepts email or userCode', () => {
    const byEmail: LoginRequest = { email: 'a@b.com', password: 'x' }
    const byCode: LoginRequest = { userCode: '12345678', password: 'x' }
    expect(byEmail.email).toBe('a@b.com')
    expect(byCode.userCode).toBe('12345678')
  })

  it('LoginResponse and FloorLoginResponse allow null email (codes-only user)', () => {
    const login: LoginResponse = {
      user: {
        id: 'user-1',
        email: null,
        name: 'Cajero Uno',
        role: 'USER',
        isSuperuser: false,
      },
      companyId: 'company-1',
    }
    expect(login.user.email).toBeNull()

    const floor: FloorLoginResponse = {
      user: {
        id: 'user-2',
        email: null,
        name: 'Cajero Dos',
        role: 'USER',
        isSuperuser: false,
      },
      companyId: 'company-1',
      membershipRole: 'USER',
    }
    expect(floor.user.email).toBeNull()
    expect(floor.membershipRole).toBe('USER')
  })

  it('MeResponse allows null email while keeping id and role', () => {
    const me: MeResponse = {
      id: 'user-1',
      email: null,
      role: 'USER',
      isActive: true,
      name: 'Cajero Uno',
      companyId: 'company-1',
      membershipRole: 'USER',
    }
    expect(me.email).toBeNull()
    expect(me.id).toBe('user-1')
    expect(me.role).toBe('USER')
  })

  it('email login responses still accept non-null email strings', () => {
    const login: LoginResponse = {
      user: {
        id: 'owner-1',
        email: 'owner@example.com',
        name: 'Owner',
        role: 'ADMIN',
        isSuperuser: false,
      },
    }
    expect(login.user.email).toBe('owner@example.com')
  })
})

describe('PR1 stop-expose — contracts omit employeeCode', () => {
  it('FloorLoginRequest/Response are marked @deprecated in contracts source', () => {
    const src = readFileSync(
      join(__dirname, '../../../../../packages/contracts/src/auth.ts'),
      'utf8',
    )
    expect(src).toMatch(/\/\*\*[\s\S]*?@deprecated[\s\S]*?\*\/\s*export type FloorLoginRequest/)
    expect(src).toMatch(/\/\*\*[\s\S]*?@deprecated[\s\S]*?\*\/\s*export type FloorLoginResponse/)
  })

  it('contracts auth surface has no employeeCode field', () => {
    const src = readFileSync(
      join(__dirname, '../../../../../packages/contracts/src/auth.ts'),
      'utf8',
    )
    expect(src).not.toMatch(/\bemployeeCode\b/)
    expect(src).toMatch(/\buserCode\b/)
  })
})

describe('PR3 hygiene — dto auth schemas are the source of truth', () => {
  it('controllers import login/floorLogin schemas from dto/auth.dto, not core/schemas/auth', () => {
    const controllerSrc = readFileSync(
      join(__dirname, '../../controllers/v1/auth.controller.ts'),
      'utf8',
    )
    expect(controllerSrc).toMatch(/from ['"]\.\.\/\.\.\/dto\/auth\.dto\.js['"]/)
    expect(controllerSrc).not.toMatch(/core\/schemas\/auth/)
  })

  it('unused core/schemas/auth.ts twin is deleted', () => {
    const twinPath = join(__dirname, '../../core/schemas/auth.ts')
    let exists = true
    try {
      readFileSync(twinPath, 'utf8')
    } catch {
      exists = false
    }
    expect(exists).toBe(false)
  })
})
