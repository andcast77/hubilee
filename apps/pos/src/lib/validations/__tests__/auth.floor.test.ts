import { describe, expect, it } from 'vitest'
import {
  floorLoginSchema,
  loginSchema,
  mapUiRoleToMembershipRole,
  buildCreateFloorMemberPayload,
  shouldShowFloorTurnstile,
} from '../auth'
import { UserRole } from '@/types'

describe('POS dual-login validations (floor staff auth)', () => {
  describe('loginSchema — owner email path', () => {
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

  describe('floorLoginSchema — companyCode + employeeCode + password', () => {
    it('accepts opaque companyCode, 6-digit employeeCode, and password', () => {
      const result = floorLoginSchema.safeParse({
        companyCode: 'a1b2c3d4e5f6a7b8',
        employeeCode: '123456',
        password: 'pin-secret',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.employeeCode).toBe('123456')
        expect(result.data.companyCode).toBe('a1b2c3d4e5f6a7b8')
      }
    })

    it('rejects non-6-digit employeeCode', () => {
      const result = floorLoginSchema.safeParse({
        companyCode: 'a1b2c3d4e5f6a7b8',
        employeeCode: '12',
        password: 'pin-secret',
      })
      expect(result.success).toBe(false)
    })

    it('accepts optional captchaToken after failures', () => {
      const result = floorLoginSchema.safeParse({
        companyCode: 'a1b2c3d4e5f6a7b8',
        employeeCode: '654321',
        password: 'pin-secret',
        captchaToken: 'turnstile-token',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.captchaToken).toBe('turnstile-token')
      }
    })
  })

  describe('shouldShowFloorTurnstile', () => {
    it('is false before any floor login failure', () => {
      expect(shouldShowFloorTurnstile(0)).toBe(false)
    })

    it('is true after at least one failed floor login attempt', () => {
      expect(shouldShowFloorTurnstile(1)).toBe(true)
      expect(shouldShowFloorTurnstile(3)).toBe(true)
    })
  })
})

describe('Cajero create → membership USER (no API CASHIER/SUPERVISOR)', () => {
  it('maps UI Cajero (CASHIER) to membership USER', () => {
    expect(mapUiRoleToMembershipRole(UserRole.CASHIER)).toBe('USER')
  })

  it('maps UI Supervisor to membership USER (floor day-1)', () => {
    expect(mapUiRoleToMembershipRole(UserRole.SUPERVISOR)).toBe('USER')
  })

  it('maps UI Administrador to membership ADMIN', () => {
    expect(mapUiRoleToMembershipRole(UserRole.ADMIN)).toBe('ADMIN')
  })

  it('buildCreateFloorMemberPayload omits email for Cajero and sends USER', () => {
    const payload = buildCreateFloorMemberPayload({
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

  it('buildCreateFloorMemberPayload includes email for ADMIN', () => {
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
