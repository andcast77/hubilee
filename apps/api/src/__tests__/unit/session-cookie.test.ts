/**
 * Browser session cookies: attach without Max-Age/Expires; clear with Max-Age=0.
 */
import { describe, expect, it } from 'vitest'
import type { FastifyReply } from 'fastify'
import type { AppConfig } from '../../core/config.js'
import {
  AUTH_REFRESH_COOKIE,
  AUTH_SESSION_COOKIE,
  attachAuthSessionCookie,
  attachRefreshSessionCookie,
  clearAllAuthCookies,
  clearAuthSessionCookie,
  clearRefreshSessionCookie,
} from '../../core/session-cookie.js'

function captureReply() {
  const cookies: string[] = []
  const reply = {
    raw: {
      appendHeader(_name: string, value: string) {
        cookies.push(value)
      },
    },
  }
  return { reply: reply as unknown as FastifyReply, cookies }
}

function testConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    NODE_ENV: 'development',
    JWT_ACCESS_EXPIRES_IN: '15m',
    REFRESH_TOKEN_EXPIRES_IN: '7d',
    ...overrides,
  } as AppConfig
}

function assertSessionCookieShape(header: string, name: string) {
  expect(header).toContain(`${name}=`)
  expect(header).toMatch(/HttpOnly/i)
  expect(header).not.toMatch(/Max-Age=/i)
  expect(header).not.toMatch(/Expires=/i)
}

describe('session cookies (browser session lifetime)', () => {
  it('attachAuthSessionCookie sets HttpOnly ms_session without Max-Age or Expires', () => {
    const { reply, cookies } = captureReply()
    attachAuthSessionCookie(reply, 'access.jwt.token', testConfig())

    expect(cookies).toHaveLength(1)
    assertSessionCookieShape(cookies[0]!, AUTH_SESSION_COOKIE)
    expect(cookies[0]).toContain(`${AUTH_SESSION_COOKIE}=${encodeURIComponent('access.jwt.token')}`)
  })

  it('attachRefreshSessionCookie sets HttpOnly ms_refresh without Max-Age or Expires', () => {
    const { reply, cookies } = captureReply()
    attachRefreshSessionCookie(reply, 'opaque-refresh-plain', testConfig())

    expect(cookies).toHaveLength(1)
    assertSessionCookieShape(cookies[0]!, AUTH_REFRESH_COOKIE)
    expect(cookies[0]).toContain(
      `${AUTH_REFRESH_COOKIE}=${encodeURIComponent('opaque-refresh-plain')}`,
    )
  })

  it('clearAuthSessionCookie expires ms_session with Max-Age=0', () => {
    const { reply, cookies } = captureReply()
    clearAuthSessionCookie(reply, testConfig())

    expect(cookies).toHaveLength(1)
    expect(cookies[0]).toContain(`${AUTH_SESSION_COOKIE}=`)
    expect(cookies[0]).toMatch(/Max-Age=0/)
    expect(cookies[0]).toMatch(/HttpOnly/i)
  })

  it('clearRefreshSessionCookie expires ms_refresh with Max-Age=0', () => {
    const { reply, cookies } = captureReply()
    clearRefreshSessionCookie(reply, testConfig())

    expect(cookies).toHaveLength(1)
    expect(cookies[0]).toContain(`${AUTH_REFRESH_COOKIE}=`)
    expect(cookies[0]).toMatch(/Max-Age=0/)
  })

  it('clearAllAuthCookies expires both auth cookies with Max-Age=0', () => {
    const { reply, cookies } = captureReply()
    clearAllAuthCookies(reply, testConfig())

    expect(cookies).toHaveLength(2)
    expect(cookies.every((c) => /Max-Age=0/.test(c))).toBe(true)
    expect(cookies.some((c) => c.includes(AUTH_SESSION_COOKIE))).toBe(true)
    expect(cookies.some((c) => c.includes(AUTH_REFRESH_COOKIE))).toBe(true)
  })

  it('production attach still omits Max-Age and uses SameSite=None + Secure', () => {
    const { reply, cookies } = captureReply()
    const prevVercel = process.env.VERCEL
    process.env.VERCEL = '1'
    try {
      attachAuthSessionCookie(reply, 'tok', testConfig({ NODE_ENV: 'production' }))
    } finally {
      if (prevVercel === undefined) delete process.env.VERCEL
      else process.env.VERCEL = prevVercel
    }

    expect(cookies).toHaveLength(1)
    assertSessionCookieShape(cookies[0]!, AUTH_SESSION_COOKIE)
    expect(cookies[0]).toMatch(/SameSite=None/)
    expect(cookies[0]).toMatch(/Secure/)
  })
})
