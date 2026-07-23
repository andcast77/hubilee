/**
 * Password-reset ticket JWT + jti one-time consumption (mocked Redis).
 */
import jwt from 'jsonwebtoken'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const redisBacking = vi.hoisted(() => ({
  map: new Map<string, string>(),
  available: true,
}))

vi.mock('../../common/cache/redis.js', () => ({
  getRedis: () => {
    if (!redisBacking.available) return null
    return {
      get: (k: string) => Promise.resolve(redisBacking.map.get(k) ?? null),
      set: (k: string, v: string, _opts?: { ex?: number }) => {
        redisBacking.map.set(k, v)
        return Promise.resolve()
      },
      del: (k: string) => {
        redisBacking.map.delete(k)
        return Promise.resolve()
      },
    }
  },
}))

import { getConfig } from '../../core/config.js'
import {
  issuePasswordResetTicket,
  verifyAndConsumePasswordResetTicket,
  PASSWORD_RESET_TICKET_PURPOSE,
} from '../../services/password-reset-ticket.service.js'

describe('password-reset-ticket.service', () => {
  beforeEach(() => {
    redisBacking.map.clear()
    redisBacking.available = true
    process.env.JWT_SECRET = 'ticket-test-secret-key-min-length-ok'
    process.env.REGISTRATION_TICKET_SECRET = 'ticket-test-registration-secret'
    process.env.NODE_ENV = 'test'
    process.env.REGISTRATION_TICKET_EXPIRES_IN = '15m'
  })

  it('issuePasswordResetTicket: JWT contains purpose and jti; stores jti in Redis', async () => {
    const email = 'claims@example.com'
    const token = await issuePasswordResetTicket(email)
    const secret = getConfig().REGISTRATION_TICKET_SECRET.trim()
    const decoded = jwt.verify(token, secret) as {
      sub?: string
      purpose?: string
      jti?: string
    }
    expect(decoded.sub).toBe(email)
    expect(decoded.purpose).toBe(PASSWORD_RESET_TICKET_PURPOSE)
    expect(decoded.jti).toMatch(/^[a-f0-9]{32}$/)
    expect(redisBacking.map.get(`pwreset:jti:${decoded.jti}`)).toBe(email)
  })

  it('issuePasswordResetTicket: rejects when Redis unavailable', async () => {
    redisBacking.available = false
    await expect(issuePasswordResetTicket('a@b.com')).rejects.toThrow(/Redis/i)
  })

  it('verifyAndConsumePasswordResetTicket: rejects when email does not match JWT sub', async () => {
    const cfg = getConfig()
    const token = await issuePasswordResetTicket('owner@example.com')
    await expect(
      verifyAndConsumePasswordResetTicket(cfg, 'other@example.com', token),
    ).rejects.toMatchObject({
      code: 'RESET_EMAIL_MISMATCH',
      statusCode: 400,
    })
  })

  it('verifyAndConsumePasswordResetTicket: rejects reuse (RESET_TICKET_REUSED)', async () => {
    const cfg = getConfig()
    const email = 'reuse@example.com'
    const token = await issuePasswordResetTicket(email)
    await verifyAndConsumePasswordResetTicket(cfg, email, token)
    await expect(verifyAndConsumePasswordResetTicket(cfg, email, token)).rejects.toMatchObject({
      code: 'RESET_TICKET_REUSED',
      statusCode: 400,
    })
  })

  it('verifyAndConsumePasswordResetTicket: rejects garbage JWT (RESET_TICKET_INVALID)', async () => {
    const cfg = getConfig()
    await expect(
      verifyAndConsumePasswordResetTicket(cfg, 'a@b.com', 'not-a-jwt'),
    ).rejects.toMatchObject({
      code: 'RESET_TICKET_INVALID',
      statusCode: 400,
    })
  })

  it('verifyAndConsumePasswordResetTicket: rejects when Redis unavailable after issue', async () => {
    const cfg = getConfig()
    const email = 'gone-redis@example.com'
    const token = await issuePasswordResetTicket(email)
    redisBacking.available = false
    await expect(verifyAndConsumePasswordResetTicket(cfg, email, token)).rejects.toMatchObject({
      code: 'OTP_STORE_UNAVAILABLE',
      statusCode: 400,
    })
  })
})
