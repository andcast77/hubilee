import { describe, expect, it } from 'vitest'
import {
  buildPosOtpEmailHtml,
  escapeHtml,
  posOtpEmailSubject,
  posOtpEmailText,
} from '../../services/email-templates/pos-otp-email.js'

describe('pos-otp-email', () => {
  it('escapeHtml neutraliza marcado', () => {
    expect(escapeHtml('<script>x</script>')).toBe('&lt;script&gt;x&lt;/script&gt;')
  })

  it('buildPosOtpEmailHtml usa estética login Pos sin promo', () => {
    const html = buildPosOtpEmailHtml({ kind: 'registration', code: '123456' })
    expect(html).toContain('#f5f7fb')
    expect(html).toContain('#0085db')
    expect(html).toContain('Hubilee')
    expect(html).toContain('Pos')
    expect(html).toContain('Verificá tu email')
    expect(html).toContain('Ingresá el código de 6 dígitos')
    expect(html).toContain('border-radius:28px')
    expect(html).not.toContain('Caja abierta')
    expect(html).not.toContain('Cobrá rápido')
    expect(html).not.toContain('$12.480')
    expect(html).not.toContain('<style')
    expect(html).not.toContain('#6366f1')
  })

  it('password-reset copy y subject', () => {
    const html = buildPosOtpEmailHtml({ kind: 'password-reset', code: '654321' })
    expect(html).toContain('Restablecé tu contraseña')
    expect(posOtpEmailSubject('password-reset')).toMatch(/contraseña/i)
    expect(posOtpEmailText('password-reset', '654321')).toContain('654321')
  })

  it('subject y text de registro incluyen el código', () => {
    expect(posOtpEmailSubject('registration')).toMatch(/verificación/i)
    expect(posOtpEmailText('registration', '998877')).toContain('998877')
  })
})
