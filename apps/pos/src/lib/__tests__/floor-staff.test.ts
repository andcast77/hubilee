import { describe, expect, it } from 'vitest'
import {
  formatUserCodeForDisplay,
  formatFloorCodesForDisplay,
  buildResetFloorPasswordPayload,
  buildAttachFloorEmailPayload,
  memberHasFloorCodes,
  memberHasUserCode,
} from '../floor-staff'

describe('user-code helpers (via floor-staff re-export)', () => {
  it('formatUserCodeForDisplay surfaces userCode for copy', () => {
    const display = formatUserCodeForDisplay('12345678')
    expect(display.userCode).toBe('12345678')
    expect(display.copyText).toContain('12345678')
  })

  it('formatFloorCodesForDisplay ignores employeeCode (uses userCode only)', () => {
    const display = formatFloorCodesForDisplay({
      userCode: '12345678',
      employeeCode: '999999',
      companyCode: 'ignored',
    })
    expect(display.employeeCode).toBe('12345678')
    expect(display.copyText).toContain('12345678')
    expect(display.copyText).not.toContain('999999')
  })

  it('memberHasUserCode / memberHasFloorCodes ignore employeeCode-only rows', () => {
    expect(memberHasUserCode({ userCode: '12345678', email: null })).toBe(true)
    expect(memberHasFloorCodes({ employeeCode: '654321', email: null })).toBe(false)
    expect(memberHasFloorCodes({ userCode: null, employeeCode: null, email: 'a@b.com' })).toBe(
      false,
    )
  })
})

describe('Admin shop-user password reset + optional email attach', () => {
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
