/**
 * Controller-level observability: requestId present; secrets absent from structured logs.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FastifyReply, FastifyRequest } from 'fastify'

const mockSend = vi.hoisted(() => vi.fn())
const mockVerify = vi.hoisted(() => vi.fn())
const mockComplete = vi.hoisted(() => vi.fn())

vi.mock('../../services/password-reset-otp.service.js', () => ({
  sendPasswordResetOtp: mockSend,
  verifyPasswordResetOtp: mockVerify,
  completePasswordReset: mockComplete,
}))

import {
  passwordReset,
  passwordResetOtpSend,
  passwordResetOtpVerify,
} from '../../controllers/v1/auth.controller.js'

function mockRequest(body: unknown, id = 'req-test-password-reset-1') {
  const info = vi.fn()
  const request = {
    id,
    ip: '127.0.0.1',
    body,
    log: { info, warn: vi.fn(), error: vi.fn() },
  } as unknown as FastifyRequest
  const reply = {} as FastifyReply
  return { request, reply, info }
}

describe('password-reset OTP observability (controller)', () => {
  beforeEach(() => {
    mockSend.mockReset()
    mockVerify.mockReset()
    mockComplete.mockReset()
    mockSend.mockResolvedValue({ sent: true })
    mockVerify.mockResolvedValue({ resetTicket: 'ticket-jwt' })
    mockComplete.mockResolvedValue({ ok: true })
  })

  it('passwordResetOtpSend logs requestId and never logs captcha/email secrets', async () => {
    const { request, reply, info } = mockRequest({
      email: 'obs@example.com',
      captchaToken: 'secret-captcha-token',
    })
    await passwordResetOtpSend(request, reply)

    expect(info).toHaveBeenCalled()
    const payload = info.mock.calls[0][0] as Record<string, unknown>
    expect(payload.requestId).toBe('req-test-password-reset-1')
    expect(payload.event).toBe('password_reset_otp_send')
    const serialized = JSON.stringify(info.mock.calls)
    expect(serialized).not.toContain('secret-captcha-token')
    expect(serialized).not.toContain('obs@example.com')
  })

  it('passwordResetOtpVerify logs requestId without OTP or ticket', async () => {
    const { request, reply, info } = mockRequest({
      email: 'obs@example.com',
      code: '123456',
    })
    await passwordResetOtpVerify(request, reply)

    expect(info).toHaveBeenCalled()
    const payload = info.mock.calls[0][0] as Record<string, unknown>
    expect(payload.requestId).toBe('req-test-password-reset-1')
    expect(payload.event).toBe('password_reset_otp_verify')
    const serialized = JSON.stringify(info.mock.calls)
    expect(serialized).not.toContain('123456')
    expect(serialized).not.toContain('ticket-jwt')
  })

  it('passwordReset logs requestId without password or ticket', async () => {
    const { request, reply, info } = mockRequest({
      email: 'obs@example.com',
      resetTicket: 'mock-reset-ticket-jwt',
      newPassword: 'newpassword1',
    })
    await passwordReset(request, reply)

    expect(info).toHaveBeenCalled()
    const payload = info.mock.calls[0][0] as Record<string, unknown>
    expect(payload.requestId).toBe('req-test-password-reset-1')
    expect(payload.event).toBe('password_reset_complete')
    const serialized = JSON.stringify(info.mock.calls)
    expect(serialized).not.toContain('newpassword1')
    expect(serialized).not.toContain('mock-reset-ticket-jwt')
  })
})
