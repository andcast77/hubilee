/**
 * Tests that `me()` returns `companyProfileComplete` correctly.
 *
 * Strict TDD: RED first — these will fail until 2.3 (service implementation) lands.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const {
  mockUserFindUnique,
  mockCompanyFindFirst,
  mockUserUpdate,
  mockStoreCount,
  mockCashRegisterCount,
  mockCompanyModuleFindMany,
  mockCompanyMemberFindMany,
  mockUserRoleAssignmentFindMany,
} = vi.hoisted(() => ({
  mockUserFindUnique: vi.fn(),
  mockCompanyFindFirst: vi.fn(),
  mockUserUpdate: vi.fn(),
  mockStoreCount: vi.fn(),
  mockCashRegisterCount: vi.fn(),
  mockCompanyModuleFindMany: vi.fn(),
  mockCompanyMemberFindMany: vi.fn(),
  mockUserRoleAssignmentFindMany: vi.fn(),
}))

// Mock prisma — must cover ALL prisma model calls made by the service -> auth-context -> modules chain
vi.mock('../../db/index.js', () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique, update: mockUserUpdate },
    company: { findFirst: mockCompanyFindFirst },
    store: { count: mockStoreCount },
    cashRegister: { count: mockCashRegisterCount },
    companyMember: { findMany: mockCompanyMemberFindMany },
    userRoleAssignment: { findMany: mockUserRoleAssignmentFindMany },
    companyModule: { findMany: mockCompanyModuleFindMany },
  },
  Prisma: {},
}))

// Mock cacheThrough so getCompanyModules runs the factory inline
vi.mock('../../common/cache/index.js', () => ({
  cacheThrough: (_key: string, factory: () => Promise<unknown>) => factory(),
  cacheDel: vi.fn(),
}))

// Mock core auth functions
vi.mock('../../core/auth.js', () => ({
  generateToken: () => 'mock-token',
  userDisplayName: (u: { firstName: string; lastName: string; email: string }) =>
    [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.email,
  verifyToken: () => null,
  generateMfaPendingToken: () => 'mock-mfa-token',
  verifyMfaPendingToken: () => null,
  accessTokenTtlSeconds: () => 3600,
  type: {},
}))

vi.mock('../../core/refresh-token.js', () => ({
  hashRefreshToken: (s: string) => `hashed:${s}`,
  generateRefreshTokenPlain: () => 'mock-refresh-plain',
}))

vi.mock('../../core/config.js', () => ({
  getConfig: () => ({
    REFRESH_TOKEN_EXPIRES_IN: '7d',
    JWT_ACCESS_EXPIRES_IN: '1h',
    JWT_SECRET: 'test-secret',
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION_MINUTES: 15,
  }),
}))

vi.mock('../../core/jwt-blacklist.js', () => ({
  blacklistJti: vi.fn(),
  blacklistJtis: vi.fn(),
  isJtiBlacklisted: vi.fn().mockResolvedValue(false),
}))

import { me } from '../../services/auth.service.js'
import type { TokenPayload } from '../../core/auth.js'

describe('me() — companyProfileComplete flag', () => {
  const baseUser = {
    id: 'user-1',
    email: 'owner@test.com',
    role: 'USER',
    isActive: true,
    firstName: 'Owner',
    lastName: 'Test',
    posPreferredCompanyId: null,
    twoFactorEnabled: false,
  }

  // Company with Google placeholder name + null taxId
  const incompleteCompany = {
    id: 'company-1',
    name: 'Mi Empresa',
    companyCode: 'ABC123',
    parentId: null,
    ownerUserId: 'user-1',
    isActive: true,
    logo: null,
    taxId: null,
    address: null,
    phone: null,
  }

  // Full real company (wizard complete: Empresa + Rubro + Local + caja)
  const completeCompany = {
    ...incompleteCompany,
    name: 'Comercial Real S.A.',
    taxId: 'RFC-123456',
    businessType: 'OTRO',
  }

  const tokenWithCompany: TokenPayload = {
    id: 'user-1',
    email: 'owner@test.com',
    role: 'USER',
    isSuperuser: false,
    companyId: 'company-1',
    membershipRole: 'OWNER',
  }

  const tokenWithoutCompany: TokenPayload = {
    id: 'user-1',
    email: 'owner@test.com',
    role: 'USER',
    isSuperuser: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUserFindUnique.mockResolvedValue(baseUser)
    mockCompanyModuleFindMany.mockResolvedValue([])
    // Default: user has one company member with active company
    mockCompanyMemberFindMany.mockResolvedValue([
      { id: 'cm-1', company: { id: 'company-1', name: 'Mi Empresa', isActive: true }, membershipRole: 'OWNER' },
    ])
    mockUserRoleAssignmentFindMany.mockResolvedValue([])
    // Wizard state queries store + cashRegister counts
    mockStoreCount.mockResolvedValue(1)
    mockCashRegisterCount.mockResolvedValue(1)
  })

  // ── incomplete scenarios ──

  it('returns companyProfileComplete=false when company has placeholder name + null taxId', async () => {
    mockCompanyFindFirst.mockResolvedValue(incompleteCompany)

    const result = await me(tokenWithCompany)

    expect(result.companyProfileComplete).toBe(false)
    expect(result.companyId).toBe('company-1')
  })

  it('returns companyProfileComplete=false when company has real name but null taxId', async () => {
    mockCompanyFindFirst.mockResolvedValue({
      ...incompleteCompany,
      name: 'Real Business',
      taxId: null,
    })

    const result = await me(tokenWithCompany)

    expect(result.companyProfileComplete).toBe(false)
  })

  // ── complete scenarios ──

  it('returns companyProfileComplete=true when company has real name+taxId', async () => {
    mockCompanyFindFirst.mockResolvedValue(completeCompany)

    const result = await me(tokenWithCompany)

    expect(result.companyProfileComplete).toBe(true)
  })

  it('returns companyProfileComplete=true with null address/phone/logo', async () => {
    mockCompanyFindFirst.mockResolvedValue({
      ...completeCompany,
      address: null,
      phone: null,
      logo: null,
    })

    const result = await me(tokenWithCompany)

    expect(result.companyProfileComplete).toBe(true)
  })

  // ── no-company scenarios ──

  it('omits companyProfileComplete when no company in token and user has no companies', async () => {
    // User has no company memberships
    mockUserFindUnique.mockResolvedValue({
      ...baseUser,
      posPreferredCompanyId: null,
    })
    mockCompanyMemberFindMany.mockResolvedValue([])
    mockUserRoleAssignmentFindMany.mockResolvedValue([])

    const result = await me(tokenWithoutCompany)

    expect(result).not.toHaveProperty('companyProfileComplete')
    expect(result.companyId).toBeUndefined()
  })

  it('computes companyProfileComplete when company is loaded via preferredCompanyId', async () => {
    mockUserFindUnique.mockResolvedValue({
      ...baseUser,
      posPreferredCompanyId: 'company-1',
    })
    mockCompanyFindFirst.mockResolvedValue(completeCompany)

    const result = await me(tokenWithoutCompany)

    expect(result.companyProfileComplete).toBe(true)
    expect(result.companyId).toBe('company-1')
  })

  // ── 2.3: Completeness false when no Local or no CashRegisters ──

  it('RED 2.3: returns companyProfileComplete=false when storeCount is 0', async () => {
    mockCompanyFindFirst.mockResolvedValue(completeCompany)
    mockStoreCount.mockResolvedValue(0)
    mockCashRegisterCount.mockResolvedValue(0)

    const result = await me(tokenWithCompany)

    // Empresa+Rubro are complete but there is no Local yet
    expect(result.companyProfileComplete).toBe(false)
    expect(result.companyId).toBe('company-1')
  })

  it('RED 2.3: returns companyProfileComplete=false when stores exist but cashRegisterCount is 0', async () => {
    mockCompanyFindFirst.mockResolvedValue(completeCompany)
    mockStoreCount.mockResolvedValue(1)
    mockCashRegisterCount.mockResolvedValue(0)

    const result = await me(tokenWithCompany)

    // Empresa+Rubro+1 store exist but no CashRegister yet
    expect(result.companyProfileComplete).toBe(false)
    expect(result.companyId).toBe('company-1')
  })
})
