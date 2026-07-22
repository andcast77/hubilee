import { describe, expect, it } from 'vitest'
import type {
  FloorLoginRequest,
  FloorLoginResponse,
  LoginResponse,
  MeResponse,
} from '@hubilee/contracts'

/**
 * Compiles only when contracts export floor-login types and optional/null email.
 * Runtime asserts concrete shapes so GREEN is behavioral, not smoke-only.
 */
describe('pos-floor-staff-auth contracts (PR1)', () => {
  it('FloorLoginRequest requires companyCode, employeeCode, password; captcha optional', () => {
    const required: FloorLoginRequest = {
      companyCode: 'a1b2c3d4e5f6a7b8',
      employeeCode: '123456',
      password: 'floor-secret',
    }
    expect(required.companyCode).toBe('a1b2c3d4e5f6a7b8')
    expect(required.employeeCode).toBe('123456')
    expect(required.password).toBe('floor-secret')
    expect(required.captchaToken).toBeUndefined()

    const withCaptcha: FloorLoginRequest = {
      ...required,
      captchaToken: 'turnstile-token',
    }
    expect(withCaptcha.captchaToken).toBe('turnstile-token')
  })

  it('LoginResponse and FloorLoginResponse allow null email (floor codes-only user)', () => {
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
