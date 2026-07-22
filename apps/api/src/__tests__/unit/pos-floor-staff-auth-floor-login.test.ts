/**
 * PR2 / Phase 2 — floor-login auth (Strict TDD).
 * Specs: pos-floor-login + auth-session delta (null email /me, lockout all paths).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import bcrypt from 'bcryptjs'

const mockCompanyFindUnique = vi.hoisted(() => vi.fn())
const mockCompanyFindFirst = vi.hoisted(() => vi.fn())
const mockMemberFindUnique = vi.hoisted(() => vi.fn())
const mockUserFindUnique = vi.hoisted(() => vi.fn())
const mockUserFindFirst = vi.hoisted(() => vi.fn())
const mockUserUpdate = vi.hoisted(() => vi.fn())
const mockSessionFindMany = vi.hoisted(() => vi.fn())
const mockSessionDeleteMany = vi.hoisted(() => vi.fn())
const mockCashSessionFindFirst = vi.hoisted(() => vi.fn())
const mockCompanyMemberFindFirst = vi.hoisted(() => vi.fn())
const mockVerifyTurnstile = vi.hoisted(() => vi.fn(async () => {}))
const mockBlacklistJtis = vi.hoisted(() => vi.fn(async () => {}))
const mockGetUserCompanies = vi.hoisted(() => vi.fn())
const mockWriteAuditLog = vi.hoisted(() => vi.fn())

vi.mock('../../db/index.js', () => ({
  prisma: {
    company: {
      findUnique: mockCompanyFindUnique,
      findFirst: mockCompanyFindFirst,
    },
    companyMember: {
      findUnique: mockMemberFindUnique,
      findFirst: mockCompanyMemberFindFirst,
    },
    user: {
      findUnique: mockUserFindUnique,
      findFirst: mockUserFindFirst,
      update: mockUserUpdate,
    },
    session: {
      findMany: mockSessionFindMany,
      deleteMany: mockSessionDeleteMany,
    },
    cashSession: { findFirst: mockCashSessionFindFirst },
  },
}))

vi.mock('../../services/turnstile.service.js', () => ({
  verifyTurnstileToken: (...args: unknown[]) => mockVerifyTurnstile(...args),
}))

vi.mock('../../core/jwt-blacklist.js', () => ({
  blacklistJti: vi.fn(async () => {}),
  blacklistJtis: (...args: unknown[]) => mockBlacklistJtis(...args),
  isJtiBlacklisted: vi.fn(async () => false),
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

import { floorLogin, login, me } from '../../services/auth.service.js'
import { generateToken, verifyToken, type TokenPayload } from '../../core/auth.js'
import { floorLoginBodySchema } from '../../dto/auth.dto.js'
import { isAuthPublicPath } from '../../plugins/core/rate-limit.plugin.js'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const COMPANY_ID = '11111111-1111-1111-1111-111111111111'
const USER_ID = '22222222-2222-2222-2222-222222222222'
const COMPANY_CODE = 'a1b2c3d4e5f6a7b8'
const EMPLOYEE_CODE = '123456'
const PASSWORD = 'FloorPass1!'

async function hashedPassword() {
  return bcrypt.hash(PASSWORD, 4)
}

function baseFloorUser(overrides: Record<string, unknown> = {}) {
  return {
    id: USER_ID,
    email: null as string | null,
    password: '',
    role: 'USER',
    isActive: true,
    isSuperuser: false,
    firstName: 'Ana',
    lastName: 'Caja',
    posPreferredCompanyId: COMPANY_ID,
    twoFactorEnabled: false,
    failedLoginAttempts: 0,
    lockedUntil: null as Date | null,
    ...overrides,
  }
}

function stubHappyPathLookups(user: ReturnType<typeof baseFloorUser>) {
  mockCompanyFindUnique.mockResolvedValue({
    id: COMPANY_ID,
    name: 'Demo Co',
    companyCode: COMPANY_CODE,
    isActive: true,
  })
  mockMemberFindUnique.mockResolvedValue({
    id: 'member-1',
    companyId: COMPANY_ID,
    userId: USER_ID,
    employeeCode: EMPLOYEE_CODE,
    membershipRole: 'USER',
    user,
  })
  mockCashSessionFindFirst.mockResolvedValue(null)
  mockSessionFindMany.mockResolvedValue([])
  mockSessionDeleteMany.mockResolvedValue({ count: 0 })
  mockUserUpdate.mockResolvedValue({})
  mockGetUserCompanies.mockResolvedValue([
    {
      id: COMPANY_ID,
      name: 'Demo Co',
      modules: { hr: false, pos: true, tech: false },
    },
  ])
  mockCompanyMemberFindFirst.mockResolvedValue({ companyId: COMPANY_ID })
}

describe('floorLoginBodySchema', () => {
  it('accepts companyCode + 6-digit employeeCode + password; captcha optional', () => {
    const parsed = floorLoginBodySchema.parse({
      companyCode: COMPANY_CODE,
      employeeCode: EMPLOYEE_CODE,
      password: PASSWORD,
    })
    expect(parsed.employeeCode).toBe(EMPLOYEE_CODE)
    expect(parsed.captchaToken).toBeUndefined()
  })

  it('rejects non-6-digit employeeCode', () => {
    const result = floorLoginBodySchema.safeParse({
      companyCode: COMPANY_CODE,
      employeeCode: '12',
      password: PASSWORD,
    })
    expect(result.success).toBe(false)
  })
})

describe('isAuthPublicPath — floor-login', () => {
  it('includes /v1/auth/floor-login in the auth-public rate-limit bucket', () => {
    expect(isAuthPublicPath('/v1/auth/floor-login')).toBe(true)
    expect(isAuthPublicPath('/v1/auth/login')).toBe(true)
    expect(isAuthPublicPath('/v1/auth/me')).toBe(false)
  })
})

describe('TokenPayload / verifyToken — nullable email', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-key-for-unit-tests-only'
    process.env.JWT_ACCESS_EXPIRES_IN = '1h'
  })

  it('round-trips JWT with email: null', () => {
    const payload: TokenPayload = {
      id: USER_ID,
      email: null,
      role: 'USER',
      companyId: COMPANY_ID,
      membershipRole: 'USER',
    }
    const decoded = verifyToken(generateToken(payload))
    expect(decoded).not.toBeNull()
    expect(decoded!.email).toBeNull()
    expect(decoded!.id).toBe(USER_ID)
    expect(decoded!.companyId).toBe(COMPANY_ID)
  })

  it('accepts JWT where email claim is absent (treat as null)', () => {
    const jwt = require('jsonwebtoken') as typeof import('jsonwebtoken')
    const token = jwt.sign({ id: USER_ID, role: 'USER' }, process.env.JWT_SECRET!, {
      expiresIn: '1h',
      jwtid: 'jti-absent-email',
    })
    const decoded = verifyToken(token)
    expect(decoded).not.toBeNull()
    expect(decoded!.email).toBeNull()
  })
})

describe('auth.controller registers POST /v1/auth/floor-login', () => {
  it('wires floor-login on the public auth routes', () => {
    const src = readFileSync(
      join(__dirname, '../../controllers/v1/auth.controller.ts'),
      'utf8',
    )
    expect(src).toMatch(/\/v1\/auth\/floor-login/)
    expect(src).toMatch(/floorLogin/)
  })
})

describe('floorLogin (service)', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    process.env.JWT_SECRET = 'test-secret-key-for-unit-tests-only'
    process.env.JWT_ACCESS_EXPIRES_IN = '1h'
    process.env.MAX_LOGIN_ATTEMPTS = '3'
    process.env.LOCKOUT_DURATION_MINUTES = '15'
    process.env.NODE_ENV = 'test'
    mockVerifyTurnstile.mockResolvedValue(undefined)
  })

  it('success: issues session token with null email, company + membership scope', async () => {
    const passwordHash = await hashedPassword()
    const user = baseFloorUser({ password: passwordHash })
    stubHappyPathLookups(user)

    const result = await floorLogin({
      companyCode: COMPANY_CODE,
      employeeCode: EMPLOYEE_CODE,
      password: PASSWORD,
    })

    expect('token' in result && result.token).toBeTruthy()
    if (!('token' in result)) throw new Error('expected token result')
    expect(result.user.email).toBeNull()
    expect(result.user.name).toBe('Ana Caja')
    expect(result.companyId).toBe(COMPANY_ID)
    expect(result.membershipRole).toBe('USER')
    expect(result.company?.id).toBe(COMPANY_ID)

    const decoded = verifyToken(result.token)
    expect(decoded?.email).toBeNull()
    expect(decoded?.companyId).toBe(COMPANY_ID)
    expect(decoded?.membershipRole).toBe('USER')
  })

  it('bad creds: unknown companyCode returns uniform 401 without field leak', async () => {
    mockCompanyFindUnique.mockResolvedValue(null)

    await expect(
      floorLogin({
        companyCode: 'unknown-code-xx',
        employeeCode: EMPLOYEE_CODE,
        password: PASSWORD,
      }),
    ).rejects.toMatchObject({
      statusCode: 401,
      message: 'Credenciales inválidas',
    })
    expect(mockMemberFindUnique).not.toHaveBeenCalled()
  })

  it('bad creds: wrong password returns same uniform message and bumps lockout', async () => {
    const passwordHash = await hashedPassword()
    const user = baseFloorUser({ password: passwordHash, failedLoginAttempts: 0 })
    stubHappyPathLookups(user)

    await expect(
      floorLogin({
        companyCode: COMPANY_CODE,
        employeeCode: EMPLOYEE_CODE,
        password: 'WrongPass!',
      }),
    ).rejects.toMatchObject({
      statusCode: 401,
      message: 'Credenciales inválidas',
    })

    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: USER_ID },
        data: expect.objectContaining({ failedLoginAttempts: 1 }),
      }),
    )
  })

  it('lockout: rejects with ACCOUNT_LOCKED while lockedUntil is in the future', async () => {
    const passwordHash = await hashedPassword()
    const lockedUntil = new Date(Date.now() + 10 * 60 * 1000)
    const user = baseFloorUser({ password: passwordHash, lockedUntil, failedLoginAttempts: 3 })
    stubHappyPathLookups(user)

    await expect(
      floorLogin({
        companyCode: COMPANY_CODE,
        employeeCode: EMPLOYEE_CODE,
        password: PASSWORD,
      }),
    ).rejects.toMatchObject({
      statusCode: 429,
      code: 'ACCOUNT_LOCKED',
    })
  })

  it('Turnstile: when failedLoginAttempts >= 1 and no captchaToken → CAPTCHA_FAILED', async () => {
    const passwordHash = await hashedPassword()
    const user = baseFloorUser({ password: passwordHash, failedLoginAttempts: 1 })
    stubHappyPathLookups(user)

    await expect(
      floorLogin({
        companyCode: COMPANY_CODE,
        employeeCode: EMPLOYEE_CODE,
        password: PASSWORD,
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'CAPTCHA_FAILED',
    })
    expect(mockVerifyTurnstile).not.toHaveBeenCalled()
  })

  it('Turnstile: when failedLoginAttempts >= 1 verifies captchaToken then succeeds', async () => {
    const passwordHash = await hashedPassword()
    const user = baseFloorUser({ password: passwordHash, failedLoginAttempts: 1 })
    stubHappyPathLookups(user)

    const result = await floorLogin({
      companyCode: COMPANY_CODE,
      employeeCode: EMPLOYEE_CODE,
      password: PASSWORD,
      captchaToken: 'turnstile-ok',
    })

    expect(mockVerifyTurnstile).toHaveBeenCalledWith('turnstile-ok')
    expect('token' in result).toBe(true)
  })

  it('revokes other Sessions before issuing a new floor login', async () => {
    const passwordHash = await hashedPassword()
    const user = baseFloorUser({ password: passwordHash })
    stubHappyPathLookups(user)
    mockSessionFindMany.mockResolvedValue([{ accessJti: 'old-jti-1' }, { accessJti: 'old-jti-2' }])

    await floorLogin({
      companyCode: COMPANY_CODE,
      employeeCode: EMPLOYEE_CODE,
      password: PASSWORD,
    })

    expect(mockSessionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: USER_ID } }),
    )
    expect(mockBlacklistJtis).toHaveBeenCalled()
    expect(mockSessionDeleteMany).toHaveBeenCalledWith({ where: { userId: USER_ID } })
  })

  it('denies floor-login while user has an OPEN CashSession', async () => {
    const passwordHash = await hashedPassword()
    const user = baseFloorUser({ password: passwordHash })
    stubHappyPathLookups(user)
    mockCashSessionFindFirst.mockResolvedValue({
      id: 'cash-open-1',
      status: 'OPEN',
      openedByUserId: USER_ID,
    })

    await expect(
      floorLogin({
        companyCode: COMPANY_CODE,
        employeeCode: EMPLOYEE_CODE,
        password: PASSWORD,
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'CASH_SESSION_OPEN',
    })
  })

  it('soft disable: isActive false blocks new floor auth', async () => {
    const passwordHash = await hashedPassword()
    const user = baseFloorUser({ password: passwordHash, isActive: false })
    stubHappyPathLookups(user)

    await expect(
      floorLogin({
        companyCode: COMPANY_CODE,
        employeeCode: EMPLOYEE_CODE,
        password: PASSWORD,
      }),
    ).rejects.toMatchObject({
      statusCode: 401,
      message: 'Usuario inactivo',
    })
  })
})

describe('email login — reject null email', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.JWT_SECRET = 'test-secret-key-for-unit-tests-only'
    process.env.JWT_ACCESS_EXPIRES_IN = '1h'
    process.env.MAX_LOGIN_ATTEMPTS = '3'
    process.env.LOCKOUT_DURATION_MINUTES = '15'
  })

  it('denies email+password login when resolved User.email is null', async () => {
    const passwordHash = await hashedPassword()
    mockUserFindFirst.mockResolvedValue(
      baseFloorUser({
        email: null,
        password: passwordHash,
      }),
    )

    await expect(
      login({ email: 'ignored@example.com', password: PASSWORD }),
    ).rejects.toMatchObject({
      statusCode: 401,
      message: 'Credenciales inválidas',
    })
  })
})

describe('me — null email', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.JWT_SECRET = 'test-secret-key-for-unit-tests-only'
  })

  it('returns me payload with email null for floor user', async () => {
    mockUserFindUnique.mockResolvedValue({
      id: USER_ID,
      email: null,
      role: 'USER',
      isActive: true,
      firstName: 'Ana',
      lastName: 'Caja',
      posPreferredCompanyId: COMPANY_ID,
      twoFactorEnabled: false,
    })
    mockGetUserCompanies.mockResolvedValue([
      {
        id: COMPANY_ID,
        name: 'Demo Co',
        modules: { hr: false, pos: true, tech: false },
      },
    ])
    mockCompanyFindFirst.mockResolvedValue({
      id: COMPANY_ID,
      name: 'Demo Co',
      isActive: true,
    })

    const result = await me({
      id: USER_ID,
      email: null,
      role: 'USER',
      companyId: COMPANY_ID,
      membershipRole: 'USER',
    })

    expect(result.email).toBeNull()
    expect(result.name).toBe('Ana Caja')
    expect(result.id).toBe(USER_ID)
  })
})
