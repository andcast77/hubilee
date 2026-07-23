/**
 * Google OAuth route redirect helpers + start/callback behavior (mocked service).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockStartGoogleOAuth = vi.hoisted(() => vi.fn())
const mockCompleteGoogleOAuthCallback = vi.hoisted(() => vi.fn())
const mockAttachWebSession = vi.hoisted(() => vi.fn())
const mockWriteAuditLog = vi.hoisted(() => vi.fn())

vi.mock('../../services/google-oauth.service.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/google-oauth.service.js')>()
  return {
    ...actual,
    startGoogleOAuth: (...args: unknown[]) => mockStartGoogleOAuth(...args),
    completeGoogleOAuthCallback: (...args: unknown[]) => mockCompleteGoogleOAuthCallback(...args),
  }
})

vi.mock('../../services/auth.service.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/auth.service.js')>()
  return {
    ...actual,
    createWebSessionPair: (...args: unknown[]) => mockAttachWebSession(...args),
  }
})

vi.mock('../../services/audit-log.service.js', () => ({
  writeAuditLog: (...args: unknown[]) => mockWriteAuditLog(...args),
}))

vi.mock('../../core/session-cookie.js', () => ({
  attachAuthSessionCookie: vi.fn(),
  attachRefreshSessionCookie: vi.fn(),
  clearAllAuthCookies: vi.fn(),
  getRefreshTokenFromCookieHeader: vi.fn(),
}))

import {
  buildGoogleOAuthAppRedirect,
  googleStart,
  googleCallback,
} from '../../controllers/v1/auth.controller.js'
import { ServiceUnavailableError } from '../../common/errors/app-error.js'

function mockReply() {
  const redirects: string[] = []
  return {
    redirects,
    redirect(url: string) {
      redirects.push(url)
      return this
    },
  }
}

describe('buildGoogleOAuthAppRedirect', () => {
  it('builds MFA redirect with tempToken (no cookies implied)', () => {
    const url = buildGoogleOAuthAppRedirect({
      returnOrigin: 'http://localhost:3002',
      kind: 'mfa',
      tempToken: 'pending-jwt',
    })
    expect(url).toBe('http://localhost:3002/login?mfa=1&tempToken=pending-jwt')
  })

  it('builds session success redirect to next or /dashboard', () => {
    expect(
      buildGoogleOAuthAppRedirect({
        returnOrigin: 'http://localhost:3002',
        kind: 'session',
        next: '/sales',
      }),
    ).toBe('http://localhost:3002/sales')
    expect(
      buildGoogleOAuthAppRedirect({
        returnOrigin: 'http://localhost:3002',
        kind: 'session',
        next: '//evil',
      }),
    ).toBe('http://localhost:3002/dashboard')
  })

  it('builds oauth_error redirect', () => {
    expect(
      buildGoogleOAuthAppRedirect({
        returnOrigin: 'http://localhost:3002',
        kind: 'error',
        errorCode: 'OAUTH_STATE_INVALID',
      }),
    ).toBe('http://localhost:3002/login?oauth_error=OAUTH_STATE_INVALID')
  })
})

describe('googleStart / googleCallback handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.JWT_SECRET = 'test-secret'
    mockAttachWebSession.mockResolvedValue({ refreshPlain: 'refresh' })
  })

  it('googleStart redirects to Google authorize URL', async () => {
    mockStartGoogleOAuth.mockResolvedValue({
      authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth?state=abc',
    })
    const reply = mockReply()
    await googleStart(
      { query: { returnOrigin: 'http://localhost:3002', intent: 'login' } } as never,
      reply as never,
    )
    expect(reply.redirects[0]).toContain('accounts.google.com')
  })

  it('googleStart surfaces 503 when Google env empty', async () => {
    mockStartGoogleOAuth.mockRejectedValue(
      new ServiceUnavailableError('Google OAuth no está configurado.', 'GOOGLE_OAUTH_DISABLED'),
    )
    await expect(
      googleStart(
        { query: { returnOrigin: 'http://localhost:3002' } } as never,
        mockReply() as never,
      ),
    ).rejects.toBeInstanceOf(ServiceUnavailableError)
  })

  it('googleCallback MFA path redirects without attaching cookies', async () => {
    mockCompleteGoogleOAuthCallback.mockResolvedValue({
      kind: 'mfa',
      tempToken: 'mfa-temp',
      returnOrigin: 'http://localhost:3002',
    })
    const reply = mockReply()
    await googleCallback(
      { query: { code: 'c', state: 's' }, ip: '127.0.0.1', headers: {} } as never,
      reply as never,
    )
    expect(reply.redirects[0]).toContain('mfa=1')
    expect(reply.redirects[0]).toContain('tempToken=mfa-temp')
    expect(mockAttachWebSession).not.toHaveBeenCalled()
  })

  it('googleCallback session path attaches cookies and redirects', async () => {
    mockCompleteGoogleOAuthCallback.mockResolvedValue({
      kind: 'session',
      returnOrigin: 'http://localhost:3002',
      next: '/dashboard',
      login: {
        token: 'access-jwt',
        user: { id: 'u1', email: 'a@b.com', name: 'A', role: 'USER', isSuperuser: false },
        companyId: 'c1',
        membershipRole: 'OWNER',
      },
    })
    const reply = mockReply()
    await googleCallback(
      { query: { code: 'c', state: 's' }, ip: '127.0.0.1', headers: {} } as never,
      reply as never,
    )
    expect(mockAttachWebSession).toHaveBeenCalled()
    expect(reply.redirects[0]).toBe('http://localhost:3002/dashboard')
  })

  it('googleCallback invalid state redirects with oauth_error when origin known', async () => {
    mockCompleteGoogleOAuthCallback.mockResolvedValue({
      kind: 'error',
      returnOrigin: 'http://localhost:3002',
      code: 'OAUTH_STATE_INVALID',
    })
    const reply = mockReply()
    await googleCallback(
      { query: { code: 'c', state: 'bad' }, ip: '127.0.0.1', headers: {} } as never,
      reply as never,
    )
    expect(reply.redirects[0]).toContain('oauth_error=OAUTH_STATE_INVALID')
    expect(mockAttachWebSession).not.toHaveBeenCalled()
  })
})
