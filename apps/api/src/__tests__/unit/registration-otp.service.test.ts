/**
 * PLAN-39 — unit tests for registration OTP (limits, verify lockout) with mocked Redis/Prisma/mail.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

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

vi.mock('../../services/turnstile.service.js', () => ({
  verifyTurnstileToken: vi.fn(async () => {}),
}))

vi.mock('../../services/mailer.service.js', () => ({
  sendRegistrationOtpEmail: mockSendRegistrationOtpEmail,
}))

vi.mock('../../services/registration-ticket.service.js', () => ({
  issueRegistrationTicket: mockIssueRegistrationTicket,
}))

import { sendRegistrationOtp, verifyRegistrationOtp } from '../../services/registration-otp.service.js'

describe('registration-otp.service (PLAN-39)', () => {
  let lastCode: string | null = null

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
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-registration-otp-tests'
    process.env.NODE_ENV = 'test'
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
})
