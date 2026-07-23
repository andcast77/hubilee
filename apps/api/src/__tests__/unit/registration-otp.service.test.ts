/**
 * PLAN-39 / auth-registration-email-otp — registration OTP (limits, captcha optional, verify lockout).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const redisBacking = vi.hoisted(() => ({ map: new Map<string, string>() }))

const mockPrismaUserFindUnique = vi.hoisted(() => vi.fn())
const mockSendRegistrationOtpEmail = vi.hoisted(() => vi.fn())
const mockIssueRegistrationTicket = vi.hoisted(() => vi.fn())

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
      findUnique: mockPrismaUserFindUnique,
      findFirst: mockPrismaUserFindUnique,
    },
  },
}))

vi.mock('../../services/mailer.service.js', () => ({
  sendRegistrationOtpEmail: mockSendRegistrationOtpEmail,
}))

vi.mock('../../services/registration-ticket.service.js', () => ({
  issueRegistrationTicket: mockIssueRegistrationTicket,
}))

import { registerOtpSendBodySchema } from '../../dto/auth.dto.js'
import { sendRegistrationOtp, verifyRegistrationOtp } from '../../services/registration-otp.service.js'

describe('registration-otp.service (PLAN-39)', () => {
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
    mockPrismaUserFindUnique.mockReset()
    mockPrismaUserFindUnique.mockResolvedValue(null)
    mockSendRegistrationOtpEmail.mockReset()
    mockSendRegistrationOtpEmail.mockImplementation(async (_to: string, code: string) => {
      lastCode = code
    })
    mockIssueRegistrationTicket.mockReset()
    mockIssueRegistrationTicket.mockResolvedValue('mock-registration-ticket-jwt')
    process.env.JWT_SECRET = 'test-jwt-secret-for-registration-otp-tests'
    process.env.NODE_ENV = 'test'
    process.env.TURNSTILE_SECRET_KEY = ''
    process.env.OTP_CHALLENGE_TTL_SECONDS = process.env.OTP_CHALLENGE_TTL_SECONDS || '600'
  })

  afterEach(() => {
    process.env.JWT_SECRET = envSnapshot.JWT_SECRET
    process.env.NODE_ENV = envSnapshot.NODE_ENV
    process.env.TURNSTILE_SECRET_KEY = envSnapshot.TURNSTILE_SECRET_KEY
    process.env.OTP_CHALLENGE_TTL_SECONDS = envSnapshot.OTP_CHALLENGE_TTL_SECONDS
  })

  it('sendRegistrationOtp: rejects after 3 sends (OTP_SEND_LIMIT)', async () => {
    const email = 'limit-test@example.com'
    for (let i = 0; i < 3; i++) {
      await sendRegistrationOtp({ email, captchaToken: 'tok' })
    }
    await expect(sendRegistrationOtp({ email, captchaToken: 'tok' })).rejects.toMatchObject({
      code: 'OTP_SEND_LIMIT',
      statusCode: 429,
    })
  })

  it('verifyRegistrationOtp: wrong code increments failures; 3 failures clears challenge (OTP_VERIFY_LOCKOUT)', async () => {
    const email = 'verify-lock@example.com'
    await sendRegistrationOtp({ email, captchaToken: 'tok' })
    expect(lastCode).toMatch(/^\d{6}$/)

    await expect(verifyRegistrationOtp({ email, code: '000000' })).rejects.toMatchObject({
      code: 'INVALID_OTP',
      statusCode: 400,
    })

    await expect(verifyRegistrationOtp({ email, code: '000000' })).rejects.toMatchObject({
      code: 'INVALID_OTP',
      statusCode: 400,
    })

    await expect(verifyRegistrationOtp({ email, code: '000000' })).rejects.toMatchObject({
      code: 'OTP_VERIFY_LOCKOUT',
      statusCode: 429,
    })

    await expect(verifyRegistrationOtp({ email, code: lastCode! })).rejects.toMatchObject({
      code: 'INVALID_OTP',
      statusCode: 400,
    })
  })

  it('verifyRegistrationOtp: success returns registrationTicket and calls issueRegistrationTicket', async () => {
    const email = 'ok-test@example.com'
    await sendRegistrationOtp({ email, captchaToken: 'tok' })
    expect(lastCode).toMatch(/^\d{6}$/)

    const out = await verifyRegistrationOtp({ email, code: lastCode! })
    expect(out.registrationTicket).toBe('mock-registration-ticket-jwt')
    expect(mockIssueRegistrationTicket).toHaveBeenCalledWith(email)
  })

  describe('optional captcha (auth-registration-email-otp)', () => {
    it('skips Turnstile when secret unset in non-prod even without captchaToken', async () => {
      process.env.TURNSTILE_SECRET_KEY = ''
      process.env.NODE_ENV = 'test'
      const email = 'skip-captcha@example.com'

      await expect(sendRegistrationOtp({ email })).resolves.toBeUndefined()
      expect(lastCode).toMatch(/^\d{6}$/)
      expect(mockSendRegistrationOtpEmail).toHaveBeenCalledWith(email, lastCode)
    })

    it('rejects CAPTCHA_FAILED when secret is configured and token empty', async () => {
      process.env.TURNSTILE_SECRET_KEY = 'test-turnstile-secret'
      process.env.NODE_ENV = 'test'
      const email = 'captcha-fail@example.com'

      await expect(sendRegistrationOtp({ email, captchaToken: '' })).rejects.toMatchObject({
        code: 'CAPTCHA_FAILED',
        statusCode: 400,
      })
      expect(mockSendRegistrationOtpEmail).not.toHaveBeenCalled()
    })

    it('rejects CAPTCHA_NOT_CONFIGURED in production when secret unset', async () => {
      process.env.TURNSTILE_SECRET_KEY = ''
      process.env.NODE_ENV = 'production'
      const email = 'prod-no-captcha@example.com'

      await expect(sendRegistrationOtp({ email, captchaToken: 'any' })).rejects.toMatchObject({
        code: 'CAPTCHA_NOT_CONFIGURED',
        statusCode: 400,
      })
      expect(mockSendRegistrationOtpEmail).not.toHaveBeenCalled()
    })

    it('registerOtpSendBodySchema accepts email without captchaToken', () => {
      const parsed = registerOtpSendBodySchema.safeParse({ email: 'dto-optional@example.com' })
      expect(parsed.success).toBe(true)
      if (parsed.success) {
        expect(parsed.data.email).toBe('dto-optional@example.com')
        expect(parsed.data.captchaToken).toBeUndefined()
      }
    })
  })
})
