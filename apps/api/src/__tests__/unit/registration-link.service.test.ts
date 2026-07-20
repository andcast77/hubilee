/**
 * PLAN-40 — magic link pre-registration (limits, lockout) with mocked Redis/Prisma/mail.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const redisBacking = vi.hoisted(() => ({ map: new Map<string, unknown>() }))

const mockPrismaUserFindUnique = vi.hoisted(() => vi.fn())
const mockSendRegistrationMagicLinkEmail = vi.hoisted(() => vi.fn())
const mockIssueRegistrationTicket = vi.hoisted(() => vi.fn())
const mockAuthRegister = vi.hoisted(() => vi.fn())

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
    user: { findUnique: mockPrismaUserFindUnique },
  },
}))

vi.mock('../../services/turnstile.service.js', () => ({
  verifyTurnstileToken: vi.fn(async () => {}),
}))

vi.mock('../../services/mailer.service.js', () => ({
  sendRegistrationMagicLinkEmail: mockSendRegistrationMagicLinkEmail,
}))

vi.mock('../../services/registration-ticket.service.js', () => ({
  issueRegistrationTicket: mockIssueRegistrationTicket,
}))

vi.mock('../../services/auth.service.js', () => ({
  register: mockAuthRegister,
}))

import { verifyTurnstileToken } from '../../services/turnstile.service.js'
import {
  sendRegistrationLink,
  completeRegistrationFromLink,
  resolveVerificationBaseUrl,
} from '../../services/registration-link.service.js'

const defaultDraft = {
  password: 'Password123',
  firstName: 'Ada',
  lastName: 'Lovelace',
  companyName: 'Test Co',
}

describe('registration-link.service (PLAN-40)', () => {
  let lastVerifyUrl: string | null = null

  beforeEach(() => {
    redisBacking.map.clear()
    lastVerifyUrl = null
    mockPrismaUserFindUnique.mockReset()
    mockPrismaUserFindUnique.mockResolvedValue(null)
    mockSendRegistrationMagicLinkEmail.mockReset()
    mockSendRegistrationMagicLinkEmail.mockImplementation(async (_to: string, url: string) => {
      lastVerifyUrl = url
    })
    mockIssueRegistrationTicket.mockReset()
    mockIssueRegistrationTicket.mockResolvedValue('mock-registration-ticket-jwt')
    mockAuthRegister.mockReset()
    mockAuthRegister.mockResolvedValue({
      user: {
        id: 'u1',
        email: 'ok-link@example.com',
        name: 'Ada Lovelace',
        role: 'USER',
        companyId: 'c1',
      },
      token: 'mock-access-jwt',
      company: {
        id: 'c1',
        name: 'Test Co',
        modules: { workify: true, pos: false, techservices: false },
      },
    })
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-registration-link-tests'
    process.env.NODE_ENV = 'test'
    process.env.CORS_ORIGIN =
      'http://localhost:3001,http://localhost:3002,http://localhost:3003,http://localhost:3004'
    process.env.HUB_PUBLIC_URL = 'http://localhost:3001'
  })

  it('resolveVerificationBaseUrl: default hub when omitted', () => {
    expect(resolveVerificationBaseUrl(undefined)).toBe('http://localhost:3001')
  })

  it('resolveVerificationBaseUrl: allows origin in CORS_ORIGIN', () => {
    expect(resolveVerificationBaseUrl('http://localhost:3003')).toBe('http://localhost:3003')
  })

  it('sendRegistrationLink: rejects after 3 sends (LINK_SEND_LIMIT)', async () => {
    const email = 'limit-link@example.com'
    for (let i = 0; i < 3; i++) {
      await sendRegistrationLink({ email, captchaToken: 'tok', draft: defaultDraft })
    }
    await expect(
      sendRegistrationLink({ email, captchaToken: 'tok', draft: defaultDraft }),
    ).rejects.toMatchObject({
      code: 'LINK_SEND_LIMIT',
      statusCode: 429,
    })
  })

  it('sendRegistrationLink: first send requires captcha', async () => {
    await expect(sendRegistrationLink({ email: 'nocap@example.com', draft: defaultDraft })).rejects.toMatchObject({
      code: 'CAPTCHA_FAILED',
      statusCode: 400,
    })
  })

  it('sendRegistrationLink: resend skips Turnstile (same pending in Redis)', async () => {
    const email = 'resend-skip-cap@example.com'
    await sendRegistrationLink({ email, captchaToken: 'tok', draft: defaultDraft })
    vi.mocked(verifyTurnstileToken).mockClear()
    await sendRegistrationLink({ email, draft: defaultDraft })
    expect(vi.mocked(verifyTurnstileToken)).not.toHaveBeenCalled()
    expect(mockSendRegistrationMagicLinkEmail).toHaveBeenCalledTimes(2)
  })

  it('completeRegistrationFromLink: wrong token increments failures; 3 failures lockout', async () => {
    const email = 'verify-link@example.com'
    await sendRegistrationLink({ email, captchaToken: 'tok', draft: defaultDraft })
    expect(lastVerifyUrl).toContain('/register/verify?token=')

    const bad = 'wrong-token-not-matching-32-chars-minimum-pad'
    await expect(completeRegistrationFromLink({ email, token: bad })).rejects.toMatchObject({
      code: 'INVALID_LINK',
      statusCode: 400,
    })
    await expect(completeRegistrationFromLink({ email, token: bad })).rejects.toMatchObject({
      code: 'INVALID_LINK',
      statusCode: 400,
    })
    await expect(completeRegistrationFromLink({ email, token: bad })).rejects.toMatchObject({
      code: 'LINK_VERIFY_LOCKOUT',
      statusCode: 429,
    })
  })

  it('completeRegistrationFromLink: success registers and returns session payload', async () => {
    const email = 'ok-link@example.com'
    await sendRegistrationLink({ email, captchaToken: 'tok', draft: defaultDraft })
    const u = new URL(lastVerifyUrl!)
    const token = u.searchParams.get('token')
    expect(token).toBeTruthy()

    const out = await completeRegistrationFromLink({ email, token: token! })
    expect(out.user.email).toBe(email)
    expect(out.token).toBe('mock-access-jwt')
    expect(mockIssueRegistrationTicket).toHaveBeenCalledWith(email)
    expect(mockAuthRegister).toHaveBeenCalledWith(
      expect.objectContaining({
        email,
        password: defaultDraft.password,
        firstName: defaultDraft.firstName,
        lastName: defaultDraft.lastName,
        companyName: defaultDraft.companyName,
        registrationTicket: 'mock-registration-ticket-jwt',
      }),
    )
  })

  it('completeRegistrationFromLink: works when Redis get returns object (Upstash auto-deserialize)', async () => {
    const email = 'object-blob@example.com'
    await sendRegistrationLink({ email, captchaToken: 'tok', draft: defaultDraft })
    const u = new URL(lastVerifyUrl!)
    const token = u.searchParams.get('token')!
    const redisKey = `reglink:pending:${Buffer.from(email.trim().toLowerCase()).toString('base64url')}`
    const stored = redisBacking.map.get(redisKey)
    expect(typeof stored).toBe('string')
    redisBacking.map.set(redisKey, JSON.parse(stored as string))

    mockAuthRegister.mockResolvedValueOnce({
      user: {
        id: 'u-obj',
        email,
        name: 'Ada Lovelace',
        role: 'USER',
        companyId: 'c1',
      },
      token: 'mock-access-jwt',
      company: {
        id: 'c1',
        name: 'Test Co',
        modules: { workify: true, pos: false, techservices: false },
      },
    })
    const out = await completeRegistrationFromLink({ email, token })
    expect(out.user.email).toBe(email)
  })

  it('completeRegistrationFromLink: if register fails, pending stays until success (retry same link)', async () => {
    const email = 'retry-after-fail@example.com'
    await sendRegistrationLink({ email, captchaToken: 'tok', draft: defaultDraft })
    const token = new URL(lastVerifyUrl!).searchParams.get('token')!
    mockAuthRegister.mockRejectedValueOnce(new Error('simulated register failure'))
    await expect(completeRegistrationFromLink({ email, token })).rejects.toThrow(
      'simulated register failure',
    )
    mockAuthRegister.mockResolvedValue({
      user: {
        id: 'u-retry',
        email,
        name: 'Ada Lovelace',
        role: 'USER',
        companyId: 'c1',
      },
      token: 'mock-access-jwt',
      company: {
        id: 'c1',
        name: 'Test Co',
        modules: { workify: true, pos: false, techservices: false },
      },
    })
    const out = await completeRegistrationFromLink({ email, token })
    expect(out.user.email).toBe(email)
    expect(mockAuthRegister).toHaveBeenCalledTimes(2)
  })
})
