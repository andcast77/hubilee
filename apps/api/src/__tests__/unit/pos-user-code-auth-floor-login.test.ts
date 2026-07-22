/**
 * Unified code login + soft-kept /floor-login alias (Strict TDD).
 * Specs: userCode + password; captcha after failed attempts; cash-session gate.
 * Pos clients MUST use /login; floorLogin remains a thin API alias.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import bcrypt from 'bcryptjs'

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
    companyMember: {
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

import { floorLogin, login } from '../../services/auth.service.js'
import { floorLoginBodySchema, loginBodySchema } from '../../dto/auth.dto.js'
import { ConflictError, BadRequestError, UnauthorizedError } from '../../common/errors/app-error.js'

const USER_ID = '22222222-2222-2222-2222-222222222222'
const COMPANY_ID = '11111111-1111-1111-1111-111111111111'
const USER_CODE = '12345678'
const PASSWORD = 'FloorPass1!'

async function hashedPassword() {
  return bcrypt.hash(PASSWORD, 4)
}

function baseUser(overrides: Record<string, unknown> = {}) {
  return {
    id: USER_ID,
    email: null as string | null,
    userCode: USER_CODE,
    password: '',
    role: 'USER',
    isActive: true,
    isSuperuser: false,
    firstName: 'Caja',
    lastName: 'Uno',
    posPreferredCompanyId: COMPANY_ID,
    twoFactorEnabled: false,
    failedLoginAttempts: 0,
    lockedUntil: null as Date | null,
    ...overrides,
  }
}

describe('loginBodySchema / floorLoginBodySchema', () => {
  it('accepts email+password or userCode+password (exactly one)', () => {
    expect(loginBodySchema.safeParse({ email: 'a@b.com', password: 'x' }).success).toBe(true)
    expect(loginBodySchema.safeParse({ userCode: USER_CODE, password: 'x' }).success).toBe(true)
    expect(loginBodySchema.safeParse({ password: 'x' }).success).toBe(false)
    expect(
      loginBodySchema.safeParse({ email: 'a@b.com', userCode: USER_CODE, password: 'x' }).success,
    ).toBe(false)
  })

  it('floorLoginBodySchema requires userCode + password', () => {
    expect(floorLoginBodySchema.safeParse({ userCode: USER_CODE, password: 'x' }).success).toBe(
      true,
    )
    expect(
      floorLoginBodySchema.safeParse({
        companyCode: 'abc',
        employeeCode: '123456',
        password: 'x',
      }).success,
    ).toBe(false)
  })
})

describe('login / floorLogin with userCode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSessionFindMany.mockResolvedValue([])
    mockSessionDeleteMany.mockResolvedValue({ count: 0 })
    mockCashSessionFindFirst.mockResolvedValue(null)
    mockCompanyMemberFindFirst.mockResolvedValue({ companyId: COMPANY_ID })
    mockGetUserCompanies.mockResolvedValue([
      { id: COMPANY_ID, name: 'Acme', modules: { hr: false, pos: true, tech: false } },
    ])
    mockUserUpdate.mockResolvedValue({})
  })

  it('issues session for valid userCode + password', async () => {
    const password = await hashedPassword()
    mockUserFindUnique.mockResolvedValue(baseUser({ password }))

    const result = await floorLogin({ userCode: USER_CODE, password: PASSWORD })
    expect(result.token).toBeTruthy()
    expect(result.user.id).toBe(USER_ID)
    expect(mockUserFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userCode: USER_CODE } }),
    )
  })

  it('soft-kept floorLogin alias matches login({ userCode }) outcome', async () => {
    const password = await hashedPassword()
    mockUserFindUnique.mockResolvedValue(baseUser({ password }))
    const viaAlias = await floorLogin({ userCode: USER_CODE, password: PASSWORD })
    mockUserFindUnique.mockResolvedValue(baseUser({ password }))
    const viaLogin = await login({ userCode: USER_CODE, password: PASSWORD })
    expect(viaAlias.user.id).toBe(viaLogin.user.id)
    expect(viaAlias.companyId).toBe(viaLogin.companyId)
  })

  it('rejects wrong password', async () => {
    const password = await hashedPassword()
    mockUserFindUnique.mockResolvedValue(baseUser({ password }))
    await expect(floorLogin({ userCode: USER_CODE, password: 'wrong' })).rejects.toBeInstanceOf(
      UnauthorizedError,
    )
  })

  it('requires captcha when failedLoginAttempts >= 1', async () => {
    const password = await hashedPassword()
    mockUserFindUnique.mockResolvedValue(baseUser({ password, failedLoginAttempts: 1 }))
    await expect(floorLogin({ userCode: USER_CODE, password: PASSWORD })).rejects.toBeInstanceOf(
      BadRequestError,
    )
  })

  it('accepts captcha when failedLoginAttempts >= 1', async () => {
    const password = await hashedPassword()
    mockUserFindUnique.mockResolvedValue(baseUser({ password, failedLoginAttempts: 1 }))
    const result = await floorLogin({
      userCode: USER_CODE,
      password: PASSWORD,
      captchaToken: 'turnstile-ok',
    })
    expect(result.token).toBeTruthy()
    expect(mockVerifyTurnstile).toHaveBeenCalled()
  })

  it('denies login while OPEN cash session exists', async () => {
    const password = await hashedPassword()
    mockUserFindUnique.mockResolvedValue(baseUser({ password }))
    mockCashSessionFindFirst.mockResolvedValue({ id: 'cash-1' })
    await expect(floorLogin({ userCode: USER_CODE, password: PASSWORD })).rejects.toBeInstanceOf(
      ConflictError,
    )
  })

  it('codes-only userCode login revokes prior sessions', async () => {
    const password = await hashedPassword()
    mockUserFindUnique.mockResolvedValue(baseUser({ password, email: null }))
    mockSessionFindMany.mockResolvedValue([{ accessJti: 'jti-old' }])

    await login({ userCode: USER_CODE, password: PASSWORD })

    expect(mockSessionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: USER_ID } }),
    )
    expect(mockBlacklistJtis).toHaveBeenCalled()
    expect(mockSessionDeleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: USER_ID } }),
    )
  })

  it('userCode login with email set does not revoke all sessions', async () => {
    const password = await hashedPassword()
    mockUserFindUnique.mockResolvedValue(
      baseUser({ password, email: 'ana@example.com' }),
    )

    await login({ userCode: USER_CODE, password: PASSWORD })

    expect(mockSessionDeleteMany).not.toHaveBeenCalled()
  })

  it('email login still works via login()', async () => {
    const password = await hashedPassword()
    mockUserFindFirst.mockResolvedValue(
      baseUser({ email: 'owner@acme.com', password, failedLoginAttempts: 0 }),
    )
    const result = await login({ email: 'owner@acme.com', password: PASSWORD })
    expect(result.token).toBeTruthy()
    expect(mockCashSessionFindFirst).not.toHaveBeenCalled()
  })
})
