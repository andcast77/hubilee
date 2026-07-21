/**
 * PLAN-39 — registration ticket JWT + jti one-time consumption (mocked Redis).
 */
import jwt from 'jsonwebtoken'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const redisBacking = vi.hoisted(() => ({ map: new Map<string, string>() }))

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

import { getConfig } from '../../core/config.js'
import {
  issueRegistrationTicket,
  verifyAndConsumeRegistrationTicket,
  REGISTRATION_TICKET_PURPOSE,
} from '../../services/registration-ticket.service.js'

describe('registration-ticket.service (PLAN-39)', () => {
  beforeEach(() => {
    redisBacking.map.clear()
    process.env.JWT_SECRET = 'ticket-test-secret-key-min-length-ok'
    process.env.REGISTRATION_TICKET_SECRET = 'ticket-test-registration-secret'
    process.env.NODE_ENV = 'test'
    process.env.REGISTRATION_TICKET_EXPIRES_IN = '15m'
  })

  it('verifyAndConsumeRegistrationTicket: rejects when email does not match JWT sub (REGISTRATION_EMAIL_MISMATCH)', async () => {
    const cfg = getConfig()
    const token = await issueRegistrationTicket('owner@example.com')
    await expect(
      verifyAndConsumeRegistrationTicket(cfg, 'other@example.com', token),
    ).rejects.toMatchObject({
      code: 'REGISTRATION_EMAIL_MISMATCH',
      statusCode: 400,
    })
  })

  it('verifyAndConsumeRegistrationTicket: rejects reuse (REGISTRATION_TICKET_REUSED)', async () => {
    const cfg = getConfig()
    const email = 'reuse@example.com'
    const token = await issueRegistrationTicket(email)
    await verifyAndConsumeRegistrationTicket(cfg, email, token)
    await expect(verifyAndConsumeRegistrationTicket(cfg, email, token)).rejects.toMatchObject({
      code: 'REGISTRATION_TICKET_REUSED',
      statusCode: 400,
    })
  })

  it('verifyAndConsumeRegistrationTicket: rejects garbage JWT (REGISTRATION_TICKET_INVALID)', async () => {
    const cfg = getConfig()
    await expect(
      verifyAndConsumeRegistrationTicket(cfg, 'a@b.com', 'not-a-jwt'),
    ).rejects.toMatchObject({
      code: 'REGISTRATION_TICKET_INVALID',
      statusCode: 400,
    })
  })

  it('issueRegistrationTicket: JWT contains purpose and jti', async () => {
    const email = 'claims@example.com'
    const token = await issueRegistrationTicket(email)
    const secret = cfgSecret()
    const decoded = jwt.verify(token, secret) as {
      sub?: string
      purpose?: string
      jti?: string
    }
    expect(decoded.sub).toBe(email)
    expect(decoded.purpose).toBe(REGISTRATION_TICKET_PURPOSE)
    expect(decoded.jti).toMatch(/^[a-f0-9]{32}$/)
  })
})

function cfgSecret(): string {
  return getConfig().REGISTRATION_TICKET_SECRET.trim()
}
