/**
 * login() must expose companyProfileComplete when a company is selected.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import bcrypt from 'bcryptjs'

const mockUserFindUnique = vi.hoisted(() => vi.fn())
const mockUserFindFirst = vi.hoisted(() => vi.fn())
const mockUserUpdate = vi.hoisted(() => vi.fn())
const mockCompanyFindFirst = vi.hoisted(() => vi.fn())
const mockGetUserCompanies = vi.hoisted(() => vi.fn())
const mockWriteAuditLog = vi.hoisted(() => vi.fn())
const mockCompanyMemberFindFirst = vi.hoisted(() => vi.fn())
const mockCashSessionFindFirst = vi.hoisted(() => vi.fn())

vi.mock('../../db/index.js', () => ({
  prisma: {
    user: {
      findUnique: mockUserFindUnique,
      findFirst: mockUserFindFirst,
      update: mockUserUpdate,
    },
    company: {
      findFirst: mockCompanyFindFirst,
    },
    companyMember: {
      findFirst: mockCompanyMemberFindFirst,
    },
    cashSession: {
      findFirst: mockCashSessionFindFirst,
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

import { login } from '../../services/auth.service.js'

const USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const COMPANY_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const EMAIL = 'owner@acme.com'
const PASSWORD = 'Password123!'

async function hashedPassword() {
  return bcrypt.hash(PASSWORD, 4)
}

function baseUser(overrides: Record<string, unknown> = {}) {
  return {
    id: USER_ID,
    email: EMAIL,
    userCode: 'U1',
    password: null as string | null,
    role: 'USER',
    isActive: true,
    isSuperuser: false,
    firstName: 'Owner',
    lastName: 'Test',
    posPreferredCompanyId: COMPANY_ID,
    twoFactorEnabled: false,
    failedLoginAttempts: 0,
    lockedUntil: null as Date | null,
    ...overrides,
  }
}

describe('login() — companyProfileComplete flag', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-unit-tests-only'
    process.env.JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '1h'
    process.env.MAX_LOGIN_ATTEMPTS = process.env.MAX_LOGIN_ATTEMPTS || '5'
    process.env.LOCKOUT_DURATION_MINUTES = process.env.LOCKOUT_DURATION_MINUTES || '15'
    mockGetUserCompanies.mockResolvedValue([
      { id: COMPANY_ID, name: 'Acme', modules: { hr: false, pos: true, tech: false } },
    ])
    mockUserUpdate.mockResolvedValue({})
    mockCompanyMemberFindFirst.mockResolvedValue({
      companyId: COMPANY_ID,
      membershipRole: 'OWNER',
    })
    mockCashSessionFindFirst.mockResolvedValue(null)
    const password = await hashedPassword()
    mockUserFindFirst.mockResolvedValue(baseUser({ password }))
    mockUserFindUnique.mockResolvedValue(baseUser({ password }))
  })

  it('returns companyProfileComplete=false for placeholder name + null taxId', async () => {
    mockCompanyFindFirst.mockResolvedValue({
      name: 'Mi Empresa',
      taxId: null,
    })

    const result = await login({ email: EMAIL, password: PASSWORD })

    expect('token' in result && result.token).toBeTruthy()
    expect(result.companyProfileComplete).toBe(false)
    expect(result.companyId).toBe(COMPANY_ID)
  })

  it('returns companyProfileComplete=true for real name + taxId', async () => {
    mockCompanyFindFirst.mockResolvedValue({
      name: 'Comercial Real S.A.',
      taxId: 'RFC-123',
    })

    const result = await login({ email: EMAIL, password: PASSWORD })

    expect(result.companyProfileComplete).toBe(true)
  })
})
