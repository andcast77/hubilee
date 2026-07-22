/**
 * Nullable password for OAuth-only users (google-oauth-auth Phase 1).
 * Spec: OAuth-only cannot password-login; password users unchanged.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import bcrypt from 'bcryptjs'

const mockUserFindUnique = vi.hoisted(() => vi.fn())
const mockUserUpdate = vi.hoisted(() => vi.fn())
const mockGetUserCompanies = vi.hoisted(() => vi.fn())
const mockWriteAuditLog = vi.hoisted(() => vi.fn())
const mockCompanyMemberFindFirst = vi.hoisted(() => vi.fn())

vi.mock('../../db/index.js', () => ({
  prisma: {
    user: {
      findUnique: mockUserFindUnique,
      update: mockUserUpdate,
    },
    companyMember: {
      findFirst: mockCompanyMemberFindFirst,
    },
  },
}))

vi.mock('../../core/auth-context.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../core/auth-context.js')>()
  return {
    ...actual,
    getUserCompanies: (...args: unknown[]) => mockGetUserCompanies(...args),
  }
})

vi.mock('../../services/audit-log.service.js', () => ({
  writeAuditLog: (...args: unknown[]) => mockWriteAuditLog(...args),
}))

vi.mock('../../core/modules.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../core/modules.js')>()
  return {
    ...actual,
    getCompanyModules: vi.fn(async () => ({ hr: false, pos: true, tech: false })),
  }
})

import { changePassword, login } from '../../services/auth.service.js'
import { UnauthorizedError, BadRequestError } from '../../common/errors/app-error.js'

const USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const COMPANY_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const EMAIL = 'oauth-only@example.com'
const PASSWORD = 'Password123!'

async function hashedPassword() {
  return bcrypt.hash(PASSWORD, 4)
}

function baseUser(overrides: Record<string, unknown> = {}) {
  return {
    id: USER_ID,
    email: EMAIL,
    password: null as string | null,
    role: 'USER',
    isActive: true,
    isSuperuser: false,
    firstName: 'OAuth',
    lastName: 'User',
    posPreferredCompanyId: COMPANY_ID,
    twoFactorEnabled: false,
    failedLoginAttempts: 0,
    lockedUntil: null as Date | null,
    ...overrides,
  }
}

describe('login with nullable password (OAuth-only)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-unit-tests-only'
    process.env.JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '1h'
    process.env.MAX_LOGIN_ATTEMPTS = process.env.MAX_LOGIN_ATTEMPTS || '5'
    process.env.LOCKOUT_DURATION_MINUTES = process.env.LOCKOUT_DURATION_MINUTES || '15'
    mockGetUserCompanies.mockResolvedValue([
      { id: COMPANY_ID, name: 'Acme', modules: { hr: false, pos: true, tech: false } },
    ])
    mockUserUpdate.mockResolvedValue({})
    mockCompanyMemberFindFirst.mockResolvedValue({ companyId: COMPANY_ID })
  })

  it('rejects password login when user.password is null', async () => {
    mockUserFindUnique.mockResolvedValue(baseUser({ password: null }))

    await expect(login({ email: EMAIL, password: PASSWORD })).rejects.toBeInstanceOf(
      UnauthorizedError,
    )
    expect(mockUserUpdate).not.toHaveBeenCalled()
  })

  it('authenticates password user with non-null password unchanged', async () => {
    const password = await hashedPassword()
    mockUserFindUnique.mockResolvedValue(baseUser({ password, email: 'owner@acme.com' }))

    const result = await login({ email: 'owner@acme.com', password: PASSWORD })
    expect('token' in result && result.token).toBeTruthy()
    expect(result.user.id).toBe(USER_ID)
  })
})

describe('changePassword with nullable password', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects changePassword when user has null password', async () => {
    mockUserFindUnique.mockResolvedValue({
      id: USER_ID,
      password: null,
      email: EMAIL,
    })

    await expect(
      changePassword(USER_ID, {
        currentPassword: 'anything',
        newPassword: 'NewPass123!',
        confirmPassword: 'NewPass123!',
      }),
    ).rejects.toBeInstanceOf(BadRequestError)
  })
})
