import { describe, expect, it } from 'vitest'
import {
  formatUserCodeForDisplay,
  memberHasUserCode,
  buildResetShopUserPasswordPayload,
  buildAttachShopUserEmailPayload,
} from '../user-code'

describe('user-code helpers', () => {
  it('formatUserCodeForDisplay surfaces userCode for copy', () => {
    const display = formatUserCodeForDisplay('12345678')
    expect(display.userCode).toBe('12345678')
    expect(display.copyText).toContain('12345678')
    expect(display.copyText.toLowerCase()).toContain('usuario')
    expect(display.copyText.toLowerCase()).not.toContain('empleado')
  })

  it('memberHasUserCode is true only when userCode is present (ignores employeeCode)', () => {
    expect(memberHasUserCode({ userCode: '12345678', email: null })).toBe(true)
    expect(memberHasUserCode({ userCode: null, employeeCode: '654321', email: null })).toBe(false)
    expect(memberHasUserCode({ userCode: null, employeeCode: null, email: 'a@b.com' })).toBe(false)
  })

  it('buildResetShopUserPasswordPayload requires new password only', () => {
    expect(buildResetShopUserPasswordPayload({ password: 'new-pass' })).toEqual({
      password: 'new-pass',
    })
  })

  it('buildAttachShopUserEmailPayload trims email', () => {
    expect(buildAttachShopUserEmailPayload({ email: '  caja@empresa.com  ' })).toEqual({
      email: 'caja@empresa.com',
    })
  })
})
