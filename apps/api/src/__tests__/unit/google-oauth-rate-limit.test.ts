/**
 * Google OAuth rate-limit scope wiring (ms-auth-google, 20/min).
 */
import Fastify from 'fastify'
import rateLimit from '@fastify/rate-limit'
import { describe, expect, it } from 'vitest'
import {
  GOOGLE_OAUTH_RATE_LIMIT_MAX,
  isAuthPublicPath,
  isGoogleOAuthPath,
} from '../../plugins/core/rate-limit.plugin.js'

describe('Google OAuth rate-limit path helpers', () => {
  it('treats google start/callback as scoped auth public paths', () => {
    expect(isGoogleOAuthPath('/v1/auth/google')).toBe(true)
    expect(isGoogleOAuthPath('/v1/auth/google/callback?code=x')).toBe(true)
    expect(isAuthPublicPath('/v1/auth/google?returnOrigin=http://localhost:3002')).toBe(true)
    expect(isAuthPublicPath('/v1/auth/google/callback')).toBe(true)
    expect(isGoogleOAuthPath('/v1/auth/login')).toBe(false)
  })

  it('treats password-reset OTP routes as auth public paths (dedicated bucket)', () => {
    expect(isAuthPublicPath('/v1/auth/password-reset/otp/send')).toBe(true)
    expect(isAuthPublicPath('/v1/auth/password-reset/otp/verify')).toBe(true)
    expect(isAuthPublicPath('/v1/auth/password-reset')).toBe(true)
  })

  it('rejects further attempts after ms-auth-google max (20/min)', async () => {
    const app = Fastify()
    let hits = 0
    await app.register(async function googleOAuthScope(f) {
      await f.register(rateLimit, {
        max: GOOGLE_OAUTH_RATE_LIMIT_MAX,
        timeWindow: '1 minute',
        name: 'ms-auth-google-test',
      })
      f.get('/v1/auth/google', async () => {
        hits += 1
        return { ok: true }
      })
    })
    await app.ready()

    for (let i = 0; i < GOOGLE_OAUTH_RATE_LIMIT_MAX; i++) {
      const res = await app.inject({ method: 'GET', url: '/v1/auth/google' })
      expect(res.statusCode).toBe(200)
    }
    const limited = await app.inject({ method: 'GET', url: '/v1/auth/google' })
    expect(limited.statusCode).toBe(429)
    expect(hits).toBe(GOOGLE_OAUTH_RATE_LIMIT_MAX)
    await app.close()
  })
})
