/**
 * auth-registration-email-otp — password-reset OTP (enumeration-safe send, 3·3, ticket consume).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const redisBacking = vi.hoisted(() => ({ map: new Map<string, string>() }))

const mockPrismaUserFindFirst = vi.hoisted(() => vi.fn())
const mockPrismaUserUpdate = vi.hoisted(() => vi.fn())
const mockSendPasswordResetOtpEmail = vi.hoisted(() => vi.fn())
const mockIssuePasswordResetTicket = vi.hoisted(() => vi.fn())
const mockVerifyAndConsumePasswordResetTicket = vi.hoisted(() => vi.fn())

vi.mock('../../common/cache/redis.js', () => ({
  getRedis: () => ({
    get: (k: string) => Promise.resolve(redisBacking.map.get(k) ?? null),
    set: (k: string, v: string, _opts?: { ex?: number }) => {
      redisBacking.map.set(k, v)
      return Promise.resolve()
    },
    del: (k: string) => {
      redisBacking.map.delete(k)
      return Promise.resolve()
    },
  }),
}))

vi.mock('../../db/index.js', () => ({
  prisma: {
    user: {
      findFirst: mockPrismaUserFindFirst,
      update: mockPrismaUserUpdate,
    },
  },
}))

vi.mock('../../services/mailer.service.js', () => ({
  sendPasswordResetOtpEmail: mockSendPasswordResetOtpEmail,
}))

vi.mock('../../services/password-reset-ticket.service.js', () => ({
  issuePasswordResetTicket: mockIssuePasswordResetTicket,
  verifyAndConsumePasswordResetTicket: mockVerifyAndConsumePasswordResetTicket,
}))

import {
  completePasswordReset,
  sendPasswordResetOtp,
  verifyPasswordResetOtp,
} from '../../services/password-reset-otp.service.js'

describe('password-reset-otp.service', () => {
  let lastCode: string | null = null
  const envSnapshot = {
    JWT_SECRET: process.env.JWT_SECRET,
    NODE_ENV: process.env.NODE_ENV,
    TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
    OTP_CHALLENGE_TTL_SECONDS: process.env.OTP_CHALLENGE_TTL_SECONDS,
  }

  beforeEach(() => {
    redisBacking.map.clear()
    lastCode = null
    mockPrismaUserFindFirst.mockReset()
    mockPrismaUserUpdate.mockReset()
    mockSendPasswordResetOtpEmail.mockReset()
    mockSendPasswordResetOtpEmail.mockImplementation(async (_to: string, code: string) => {
      lastCode = code
    })
    mockIssuePasswordResetTicket.mockReset()
    mockIssuePasswordResetTicket.mockResolvedValue('mock-reset-ticket-jwt')
    mockVerifyAndConsumePasswordResetTicket.mockReset()
    mockVerifyAndConsumePasswordResetTicket.mockResolvedValue(undefined)
    process.env.JWT_SECRET = 'test-jwt-secret-for-password-reset-otp-tests'
    process.env.NODE_ENV = 'test'
    process.env.TURNSTILE_SECRET_KEY = ''
    process.env.OTP_CHALLENGE_TTL_SECONDS = process.env.OTP_CHALLENGE_TTL_SECONDS || '600'
    process.env.OTP_SEND_MAX = '3'
  })

  afterEach(() => {
    process.env.JWT_SECRET = envSnapshot.JWT_SECRET
    process.env.NODE_ENV = envSnapshot.NODE_ENV
    process.env.TURNSTILE_SECRET_KEY = envSnapshot.TURNSTILE_SECRET_KEY
    process.env.OTP_CHALLENGE_TTL_SECONDS = envSnapshot.OTP_CHALLENGE_TTL_SECONDS
  })

  it('sendPasswordResetOtp: known user stores challenge and emails code; returns sent:true', async () => {
    const email = 'known@example.com'
    mockPrismaUserFindFirst.mockResolvedValue({ id: 'u1', email, password: 'hash', isActive: true })

    const out = await sendPasswordResetOtp({ email })
    expect(out).toEqual({ sent: true })
    expect(lastCode).toMatch(/^\d{6}$/)
    expect(mockSendPasswordResetOtpEmail).toHaveBeenCalledWith(email, lastCode)

    const key = `pwreset:ch:${Buffer.from(email).toString('base64url')}`
    expect(redisBacking.map.has(key)).toBe(true)
  })

  it('sendPasswordResetOtp: unknown email still returns sent:true without mailing', async () => {
    mockPrismaUserFindFirst.mockResolvedValue(null)
    const email = 'unknown@example.com'

    const out = await sendPasswordResetOtp({ email })
    expect(out).toEqual({ sent: true })
    expect(mockSendPasswordResetOtpEmail).not.toHaveBeenCalled()
    expect(redisBacking.map.size).toBe(0)
  })

  it('sendPasswordResetOtp: rejects after 3 sends (OTP_SEND_LIMIT)', async () => {
    const email = 'limit@example.com'
    mockPrismaUserFindFirst.mockResolvedValue({ id: 'u1', email, password: 'hash', isActive: true })
    for (let i = 0; i < 3; i++) {
      await sendPasswordResetOtp({ email })
    }
    await expect(sendPasswordResetOtp({ email })).rejects.toMatchObject({
      code: 'OTP_SEND_LIMIT',
      statusCode: 429,
    })
  })

  it('verifyPasswordResetOtp: wrong code thrice locks out (OTP_VERIFY_LOCKOUT)', async () => {
    const email = 'lock@example.com'
    mockPrismaUserFindFirst.mockResolvedValue({ id: 'u1', email, password: 'hash', isActive: true })
    await sendPasswordResetOtp({ email })
    expect(lastCode).toMatch(/^\d{6}$/)

    await expect(verifyPasswordResetOtp({ email, code: '000000' })).rejects.toMatchObject({
      code: 'INVALID_OTP',
    })
    await expect(verifyPasswordResetOtp({ email, code: '000000' })).rejects.toMatchObject({
      code: 'INVALID_OTP',
    })
    await expect(verifyPasswordResetOtp({ email, code: '000000' })).rejects.toMatchObject({
      code: 'OTP_VERIFY_LOCKOUT',
      statusCode: 429,
    })
  })

  it('verifyPasswordResetOtp: success returns resetTicket and consumes challenge', async () => {
    const email = 'ok@example.com'
    mockPrismaUserFindFirst.mockResolvedValue({ id: 'u1', email, password: 'hash', isActive: true })
    await sendPasswordResetOtp({ email })

    const out = await verifyPasswordResetOtp({ email, code: lastCode! })
    expect(out.resetTicket).toBe('mock-reset-ticket-jwt')
    expect(mockIssuePasswordResetTicket).toHaveBeenCalledWith(email)
    const key = `pwreset:ch:${Buffer.from(email).toString('base64url')}`
    expect(redisBacking.map.has(key)).toBe(false)
  })

  it('completePasswordReset: consumes ticket and updates password hash', async () => {
    const email = 'reset@example.com'
    mockPrismaUserFindFirst.mockResolvedValue({ id: 'u42', email, password: 'old', isActive: true })
    mockPrismaUserUpdate.mockResolvedValue({ id: 'u42' })

    const out = await completePasswordReset({
      email,
      resetTicket: 'mock-reset-ticket-jwt',
      newPassword: 'newpassword1',
    })
    expect(out).toEqual({ ok: true })
    expect(mockVerifyAndConsumePasswordResetTicket).toHaveBeenCalled()
    expect(mockPrismaUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u42' },
        data: expect.objectContaining({
          password: expect.any(String),
          failedLoginAttempts: 0,
          lockedUntil: null,
        }),
      }),
    )
    const hashed = mockPrismaUserUpdate.mock.calls[0][0].data.password as string
    expect(hashed).not.toBe('newpassword1')
    expect(hashed.length).toBeGreaterThan(20)
  })

  it('observability: send/verify/reset do not log OTP, password, or captcha', async () => {
    const email = 'obs@example.com'
    mockPrismaUserFindFirst.mockResolvedValue({ id: 'u9', email, password: 'hash', isActive: true })
    mockPrismaUserUpdate.mockResolvedValue({ id: 'u9' })
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await sendPasswordResetOtp({ email, captchaToken: 'secret-captcha-token' })
    await verifyPasswordResetOtp({ email, code: lastCode! })
    await completePasswordReset({
      email,
      resetTicket: 'mock-reset-ticket-jwt',
      newPassword: 'newpassword1',
    })

    const all = [...infoSpy.mock.calls, ...warnSpy.mock.calls, ...errorSpy.mock.calls, ...logSpy.mock.calls]
      .flat()
      .map(String)
      .join('\n')
    expect(all).not.toContain(lastCode!)
    expect(all).not.toContain('secret-captcha-token')
    expect(all).not.toContain('newpassword1')
    expect(all).not.toContain('mock-reset-ticket-jwt')

    infoSpy.mockRestore()
    warnSpy.mockRestore()
    errorSpy.mockRestore()
    logSpy.mockRestore()
  })
})
