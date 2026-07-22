import { describe, expect, it } from 'vitest'
import {
  formatFloorCodesForDisplay,
  buildResetFloorPasswordPayload,
  buildAttachFloorEmailPayload,
  memberHasFloorCodes,
} from '../floor-staff'

describe('Floor codes visible/copyable', () => {
  it('formatFloorCodesForDisplay surfaces companyCode and employeeCode for copy', () => {
    const display = formatFloorCodesForDisplay({
      companyCode: 'a1b2c3d4e5f6a7b8',
      employeeCode: '123456',
    })
    expect(display.companyCode).toBe('a1b2c3d4e5f6a7b8')
    expect(display.employeeCode).toBe('123456')
    expect(display.copyText).toContain('a1b2c3d4e5f6a7b8')
    expect(display.copyText).toContain('123456')
  })

  it('memberHasFloorCodes is true when employeeCode is present', () => {
    expect(memberHasFloorCodes({ employeeCode: '654321', email: null })).toBe(true)
    expect(memberHasFloorCodes({ employeeCode: null, email: 'a@b.com' })).toBe(false)
  })
})

describe('Admin floor password reset + optional email attach', () => {
  it('buildResetFloorPasswordPayload requires new password only', () => {
    expect(buildResetFloorPasswordPayload({ password: 'new-floor-pass' })).toEqual({
      password: 'new-floor-pass',
    })
  })

  it('buildAttachFloorEmailPayload sends unique email for later attach', () => {
    expect(buildAttachFloorEmailPayload({ email: 'caja@empresa.com' })).toEqual({
      email: 'caja@empresa.com',
    })
  })
})
