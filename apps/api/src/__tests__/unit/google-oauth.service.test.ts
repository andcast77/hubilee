/**
 * Google OAuth link/create rules + state helpers (google-oauth-auth).
 * Design: unverified email fails closed (no link, no create).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const redisBacking = vi.hoisted(() => ({ map: new Map<string, unknown>() }))

const mockOAuthFindUnique = vi.hoisted(() => vi.fn())
const mockOAuthCreate = vi.hoisted(() => vi.fn())
const mockUserFindUnique = vi.hoisted(() => vi.fn())
const mockUserCreate = vi.hoisted(() => vi.fn())
const mockCompanyMemberFindFirst = vi.hoisted(() => vi.fn())
const mockTransaction = vi.hoisted(() => vi.fn())
const mockFindModulesByKeys = vi.hoisted(() => vi.fn())

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
    oAuthAccount: {
      findUnique: mockOAuthFindUnique,
      create: mockOAuthCreate,
    },
    user: {
      findUnique: mockUserFindUnique,
      create: mockUserCreate,
    },
    companyMember: {
      findFirst: mockCompanyMemberFindFirst,
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}))

vi.mock('../../core/modules.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../core/modules.js')>()
  return {
    ...actual,
    findModulesByKeys: (...args: unknown[]) => mockFindModulesByKeys(...args),
    getCompanyModules: vi.fn(async () => ({ hr: false, pos: true, tech: false })),
  }
})

vi.mock('../../core/auth-context.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../core/auth-context.js')>()
  return {
    ...actual,
    getUserCompanies: vi.fn(async () => [
      { id: 'company-1', name: 'Acme', modules: { hr: false, pos: true, tech: false } },
    ]),
  }
})

import {
  resolveGoogleIdentityLink,
  createGoogleOAuthState,
  consumeGoogleOAuthState,
  assertGoogleOAuthConfigured,
  resolveOrCreateGoogleUser,
  ensureCompanyForRegisterIntent,
  safeOAuthNextPath,
} from '../../services/google-oauth.service.js'
import { BadRequestError, ServiceUnavailableError } from '../../common/errors/app-error.js'

describe('resolveGoogleIdentityLink', () => {
  it('uses existing OAuthAccount by provider+sub', () => {
    expect(
      resolveGoogleIdentityLink({
        emailVerified: false,
        existingOAuthUserId: 'user-linked',
        existingUserByEmailId: 'other',
      }),
    ).toEqual({ action: 'use_existing', userId: 'user-linked' })
  })

  it('rejects unverified email when no OAuthAccount (fail closed)', () => {
    expect(
      resolveGoogleIdentityLink({
        emailVerified: false,
        existingOAuthUserId: null,
        existingUserByEmailId: 'user-email',
      }),
    ).toEqual({ action: 'reject', reason: 'EMAIL_NOT_VERIFIED' })
  })

  it('auto-links verified email to existing user', () => {
    expect(
      resolveGoogleIdentityLink({
        emailVerified: true,
        existingOAuthUserId: null,
        existingUserByEmailId: 'user-email',
      }),
    ).toEqual({ action: 'auto_link', userId: 'user-email' })
  })

  it('creates user when verified and no match', () => {
    expect(
      resolveGoogleIdentityLink({
        emailVerified: true,
        existingOAuthUserId: null,
        existingUserByEmailId: null,
      }),
    ).toEqual({ action: 'create_user' })
  })
})

describe('Google OAuth Redis state', () => {
  beforeEach(() => {
    redisBacking.map.clear()
    process.env.JWT_SECRET = 'test-secret'
  })

  it('create + consume is single-use', async () => {
    const state = await createGoogleOAuthState({
      returnOrigin: 'http://localhost:3002',
      intent: 'login',
      next: '/dashboard',
    })
    const first = await consumeGoogleOAuthState(state)
    expect(first).toEqual({
      returnOrigin: 'http://localhost:3002',
      intent: 'login',
      next: '/dashboard',
    })
    await expect(consumeGoogleOAuthState(state)).rejects.toBeInstanceOf(BadRequestError)
  })
})

describe('assertGoogleOAuthConfigured', () => {
  it('throws 503 when GOOGLE_CLIENT_ID empty', () => {
    process.env.GOOGLE_CLIENT_ID = ''
    process.env.GOOGLE_CLIENT_SECRET = 'sec'
    process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/v1/auth/google/callback'
    expect(() => assertGoogleOAuthConfigured()).toThrow(ServiceUnavailableError)
  })

  it('passes when all Google env set', () => {
    process.env.GOOGLE_CLIENT_ID = 'cid'
    process.env.GOOGLE_CLIENT_SECRET = 'sec'
    process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/v1/auth/google/callback'
    expect(() => assertGoogleOAuthConfigured()).not.toThrow()
  })
})

describe('safeOAuthNextPath', () => {
  it('allows same-origin path only', () => {
    expect(safeOAuthNextPath('/dashboard')).toBe('/dashboard')
    expect(safeOAuthNextPath('/app/sales')).toBe('/app/sales')
    expect(safeOAuthNextPath('//evil.com')).toBeNull()
    expect(safeOAuthNextPath('https://evil.com')).toBeNull()
    expect(safeOAuthNextPath(null)).toBeNull()
  })
})

describe('resolveOrCreateGoogleUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOAuthCreate.mockResolvedValue({})
  })

  it('returns existing OAuthAccount user without creating', async () => {
    mockOAuthFindUnique.mockResolvedValue({ userId: 'u-oauth' })
    const result = await resolveOrCreateGoogleUser({
      sub: 'google-sub-1',
      email: 'a@example.com',
      email_verified: true,
      given_name: 'Ada',
      family_name: 'Lovelace',
    })
    expect(result).toEqual({ userId: 'u-oauth', created: false, linked: false })
    expect(mockUserCreate).not.toHaveBeenCalled()
  })

  it('auto-links verified email', async () => {
    mockOAuthFindUnique.mockResolvedValue(null)
    mockUserFindUnique.mockResolvedValue({ id: 'u-existing' })
    const result = await resolveOrCreateGoogleUser({
      sub: 'google-sub-2',
      email: 'Owner@Example.com',
      email_verified: true,
    })
    expect(result).toEqual({ userId: 'u-existing', created: false, linked: true })
    expect(mockOAuthCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          provider: 'google',
          providerAccountId: 'google-sub-2',
          userId: 'u-existing',
        }),
      }),
    )
  })

  it('rejects unverified email (no link, no create)', async () => {
    mockOAuthFindUnique.mockResolvedValue(null)
    mockUserFindUnique.mockResolvedValue({ id: 'u-existing' })
    await expect(
      resolveOrCreateGoogleUser({
        sub: 'google-sub-3',
        email: 'a@example.com',
        email_verified: false,
      }),
    ).rejects.toMatchObject({ code: 'GOOGLE_EMAIL_NOT_VERIFIED' })
    expect(mockOAuthCreate).not.toHaveBeenCalled()
    expect(mockUserCreate).not.toHaveBeenCalled()
  })

  it('creates OAuth-only user with null password when no match', async () => {
    mockOAuthFindUnique.mockResolvedValue(null)
    mockUserFindUnique.mockResolvedValue(null)
    mockUserCreate.mockResolvedValue({ id: 'u-new' })
    const result = await resolveOrCreateGoogleUser({
      sub: 'google-sub-4',
      email: 'new@example.com',
      email_verified: true,
      given_name: 'New',
      family_name: 'User',
    })
    expect(result).toEqual({ userId: 'u-new', created: true, linked: true })
    expect(mockUserCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'new@example.com',
          password: null,
          emailVerified: true,
          firstName: 'New',
          lastName: 'User',
        }),
      }),
    )
  })
})

describe('ensureCompanyForRegisterIntent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFindModulesByKeys.mockResolvedValue(
      new Map([
        ['hr', { id: 'mod-hr' }],
        ['pos', { id: 'mod-pos' }],
        ['tech', { id: 'mod-tech' }],
      ]),
    )
  })

  it('creates Company + OWNER + posEnabled when user has no membership', async () => {
    mockCompanyMemberFindFirst.mockResolvedValue(null)
    const companyMemberCreate = vi.fn(async () => ({}))
    const companyModuleCreate = vi.fn(async () => ({}))
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        company: {
          create: vi.fn(async () => ({ id: 'c-new', name: 'New Co' })),
        },
        companyMember: { create: companyMemberCreate },
        companyModule: { create: companyModuleCreate },
        role: {
          findFirst: vi.fn(async () => null),
          create: vi.fn(async () => ({ id: 'role-admin' })),
        },
        userRoleAssignment: { create: vi.fn(async () => ({})) },
      }
      return fn(tx)
    })

    const companyId = await ensureCompanyForRegisterIntent({
      userId: 'u1',
      companyName: 'New Co',
    })
    expect(companyId).toBe('c-new')
    expect(companyMemberCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'u1',
          companyId: 'c-new',
          membershipRole: 'OWNER',
        }),
      }),
    )
    expect(companyModuleCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          companyId: 'c-new',
          moduleId: 'mod-pos',
          enabled: true,
        }),
      }),
    )
  })

  it('skips create when membership already exists', async () => {
    mockCompanyMemberFindFirst.mockResolvedValue({ companyId: 'c-existing' })
    const companyId = await ensureCompanyForRegisterIntent({
      userId: 'u1',
      companyName: 'Ignored',
    })
    expect(companyId).toBe('c-existing')
    expect(mockTransaction).not.toHaveBeenCalled()
  })
})
