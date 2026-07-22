import { describe, expect, it } from 'vitest'
import {
  codeLoginSchema,
  floorLoginSchema,
  loginSchema,
  mapUiRoleToMembershipRole,
  buildCreateShopMemberPayload,
  buildCreateFloorMemberPayload,
  shouldShowCodeTurnstile,
  shouldShowFloorTurnstile,
} from '../auth'
import { UserRole } from '@/types'

describe('POS unified login validations (userCode + email)', () => {
  describe('loginSchema — email path', () => {
    it('accepts valid email + password', () => {
      const result = loginSchema.safeParse({
        email: 'owner@empresa.com',
        password: 'secret123',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe('owner@empresa.com')
      }
    })

    it('rejects missing password', () => {
      const result = loginSchema.safeParse({
        email: 'owner@empresa.com',
        password: '',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('codeLoginSchema — userCode + password', () => {
    it('accepts userCode and password', () => {
      const result = codeLoginSchema.safeParse({
        userCode: '12345678',
        password: 'pin-secret',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.userCode).toBe('12345678')
      }
    })

    it('floorLoginSchema is a deprecated alias of codeLoginSchema', () => {
      const result = floorLoginSchema.safeParse({
        userCode: '87654321',
        password: 'pin-secret',
      })
      expect(result.success).toBe(true)
    })

    it('rejects empty userCode', () => {
      const result = codeLoginSchema.safeParse({
        userCode: '   ',
        password: 'pin-secret',
      })
      expect(result.success).toBe(false)
    })

    it('rejects legacy companyCode + employeeCode body', () => {
      const result = codeLoginSchema.safeParse({
        companyCode: 'a1b2c3d4e5f6a7b8',
        employeeCode: '123456',
        password: 'pin-secret',
      })
      expect(result.success).toBe(false)
    })

    it('accepts optional captchaToken after failures', () => {
      const result = codeLoginSchema.safeParse({
        userCode: '12345678',
        password: 'pin-secret',
        captchaToken: 'turnstile-token',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.captchaToken).toBe('turnstile-token')
      }
    })
  })

  describe('shouldShowCodeTurnstile', () => {
    it('is false before any code login failure', () => {
      expect(shouldShowCodeTurnstile(0)).toBe(false)
      expect(shouldShowFloorTurnstile(0)).toBe(false)
    })

    it('is true after at least one failed code login attempt', () => {
      expect(shouldShowCodeTurnstile(1)).toBe(true)
      expect(shouldShowFloorTurnstile(3)).toBe(true)
    })
  })
})

describe('Cajero create → membership USER (no API CASHIER/SUPERVISOR)', () => {
  it('maps UI Cajero (CASHIER) to membership USER', () => {
    expect(mapUiRoleToMembershipRole(UserRole.CASHIER)).toBe('USER')
  })

  it('maps UI Supervisor to membership USER', () => {
    expect(mapUiRoleToMembershipRole(UserRole.SUPERVISOR)).toBe('USER')
  })

  it('maps UI Administrador to membership ADMIN', () => {
    expect(mapUiRoleToMembershipRole(UserRole.ADMIN)).toBe('ADMIN')
  })

  it('buildCreateShopMemberPayload omits email for Cajero and sends USER', () => {
    const payload = buildCreateShopMemberPayload({
      name: 'Ana Caja',
      email: '',
      password: 'caja-pass-1',
      role: UserRole.CASHIER,
      active: true,
      storeIds: ['11111111-1111-4111-8111-111111111111'],
    })
    expect(payload).toEqual({
      password: 'caja-pass-1',
      firstName: 'Ana',
      lastName: 'Caja',
      membershipRole: 'USER',
      storeIds: ['11111111-1111-4111-8111-111111111111'],
    })
    expect(payload).not.toHaveProperty('email')
    expect(JSON.stringify(payload)).not.toMatch(/CASHIER|SUPERVISOR/)
  })

  it('deprecated buildCreateFloorMemberPayload aliases shop member builder', () => {
    const payload = buildCreateFloorMemberPayload({
      name: 'Admin User',
      email: 'admin@empresa.com',
      password: 'admin-pass-1',
      role: UserRole.ADMIN,
      active: true,
    })
    expect(payload.membershipRole).toBe('ADMIN')
    expect(payload.email).toBe('admin@empresa.com')
  })
})
