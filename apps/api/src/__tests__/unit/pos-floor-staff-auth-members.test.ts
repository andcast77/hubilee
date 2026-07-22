/**
 * PR3 / Phase 3 — floor staff members provisioning (Strict TDD).
 * Specs: pos-floor-staff-provisioning + company-members delta.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import bcrypt from 'bcryptjs'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const mockUserFindFirst = vi.hoisted(() => vi.fn())
const mockUserFindUnique = vi.hoisted(() => vi.fn())
const mockUserCreate = vi.hoisted(() => vi.fn())
const mockUserUpdate = vi.hoisted(() => vi.fn())
const mockMemberCreate = vi.hoisted(() => vi.fn())
const mockMemberFindUnique = vi.hoisted(() => vi.fn())
const mockMemberFindFirst = vi.hoisted(() => vi.fn())
const mockMemberUpdate = vi.hoisted(() => vi.fn())
const mockStoreFindMany = vi.hoisted(() => vi.fn())
const mockUserStoreUpsert = vi.hoisted(() => vi.fn())
const mockUserStoreFindMany = vi.hoisted(() => vi.fn())
const mockCompanyFindUnique = vi.hoisted(() => vi.fn())
const mockCompanyFindFirst = vi.hoisted(() => vi.fn())

vi.mock('../../db/index.js', () => ({
  prisma: {
    user: {
      findFirst: mockUserFindFirst,
      findUnique: mockUserFindUnique,
      create: mockUserCreate,
      update: mockUserUpdate,
    },
    companyMember: {
      create: mockMemberCreate,
      findUnique: mockMemberFindUnique,
      findFirst: mockMemberFindFirst,
      update: mockMemberUpdate,
      findMany: vi.fn(),
    },
    store: { findMany: mockStoreFindMany },
    userStore: {
      upsert: mockUserStoreUpsert,
      findMany: mockUserStoreFindMany,
      deleteMany: vi.fn(),
    },
    company: {
      findUnique: mockCompanyFindUnique,
      findFirst: mockCompanyFindFirst,
    },
  },
}))

import {
  create,
  resetMemberPassword,
  attachMemberEmail,
  generateEmployeeCode,
} from '../../services/company-members.service.js'
import { createMemberBodySchema, resetMemberPasswordBodySchema, attachMemberEmailBodySchema } from '../../dto/company-members.dto.js'
import { generateOpaqueCompanyCode } from '../../services/company-code.js'
import { getCredentials } from '../../services/companies.service.js'
import type { TokenPayload } from '../../core/auth.js'
import { BadRequestError } from '../../common/errors/app-error.js'

const COMPANY_ID = '11111111-1111-4111-8111-111111111111'
const STORE_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const STORE_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const USER_ID = '22222222-2222-4222-8222-222222222222'
const PASSWORD = 'FloorPass1!'

const ownerCaller: TokenPayload = {
  id: 'owner-1',
  email: 'owner@example.com',
  role: 'USER',
  companyId: COMPANY_ID,
  membershipRole: 'OWNER',
  isSuperuser: false,
}

describe('createMemberBodySchema — optional email (floor)', () => {
  it('accepts USER create without email', () => {
    const parsed = createMemberBodySchema.parse({
      password: PASSWORD,
      membershipRole: 'USER',
      firstName: 'Ana',
      lastName: 'Caja',
      storeIds: [STORE_A],
    })
    expect(parsed.email).toBeUndefined()
    expect(parsed.membershipRole).toBe('USER')
  })

  it('still accepts ADMIN create with email', () => {
    const parsed = createMemberBodySchema.parse({
      email: 'admin@example.com',
      password: PASSWORD,
      membershipRole: 'ADMIN',
    })
    expect(parsed.email).toBe('admin@example.com')
  })

  it('rejects ADMIN create without email', () => {
    expect(() =>
      createMemberBodySchema.parse({
        password: PASSWORD,
        membershipRole: 'ADMIN',
      }),
    ).toThrow()
  })
})

describe('generateEmployeeCode', () => {
  it('returns a 6-digit numeric string', () => {
    const code = generateEmployeeCode()
    expect(code).toMatch(/^\d{6}$/)
  })

  it('is not a fixed constant across calls (triangulate randomness)', () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateEmployeeCode()))
    expect(codes.size).toBeGreaterThan(1)
  })
})

describe('generateOpaqueCompanyCode', () => {
  it('returns opaque hex of length 16 (8 random bytes)', () => {
    const code = generateOpaqueCompanyCode()
    expect(code).toMatch(/^[0-9a-f]{16}$/)
  })

  it('varies across calls (unguessable)', () => {
    const codes = new Set(Array.from({ length: 10 }, () => generateOpaqueCompanyCode()))
    expect(codes.size).toBeGreaterThan(1)
  })
})

describe('company-members.create — floor USER without email', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUserFindFirst.mockResolvedValue(null)
    mockMemberFindFirst.mockResolvedValue(null)
    mockUserCreate.mockResolvedValue({
      id: USER_ID,
      email: null,
      firstName: 'Ana',
      lastName: 'Caja',
    })
    mockMemberCreate.mockResolvedValue({
      id: 'member-1',
      userId: USER_ID,
      companyId: COMPANY_ID,
      membershipRole: 'USER',
      employeeCode: '123456',
    })
    mockUserStoreUpsert.mockResolvedValue({})
  })

  it('codes-only: omit email → null email, 6-digit employeeCode, USER, exactly one UserStore', async () => {
    mockStoreFindMany.mockResolvedValue([{ id: STORE_A }])

    const result = await create(COMPANY_ID, ownerCaller, {
      password: PASSWORD,
      membershipRole: 'USER',
      firstName: 'Ana',
      lastName: 'Caja',
    })

    expect(mockUserCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: null,
          firstName: 'Ana',
          lastName: 'Caja',
          role: 'USER',
        }),
      }),
    )
    expect(mockMemberCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          membershipRole: 'USER',
          employeeCode: expect.stringMatching(/^\d{6}$/),
          companyId: COMPANY_ID,
          userId: USER_ID,
        }),
      }),
    )
    expect(mockUserStoreUpsert).toHaveBeenCalledTimes(1)
    expect(mockUserStoreUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ userId: USER_ID, storeId: STORE_A }),
      }),
    )
    expect(result.user.email).toBeNull()
    expect(result.employeeCode).toMatch(/^\d{6}$/)
    expect(result.membershipRole).toBe('USER')
    expect(result.storeIds).toEqual([STORE_A])
  })

  it('multi-store with no pick → reject (never all-stores default)', async () => {
    mockStoreFindMany.mockResolvedValue([{ id: STORE_A }, { id: STORE_B }])

    await expect(
      create(COMPANY_ID, ownerCaller, {
        password: PASSWORD,
        membershipRole: 'USER',
        firstName: 'Ana',
      }),
    ).rejects.toBeInstanceOf(BadRequestError)

    expect(mockUserCreate).not.toHaveBeenCalled()
  })

  it('multi-store with exactly one storeIds pick → assign only that store', async () => {
    mockStoreFindMany
      .mockResolvedValueOnce([{ id: STORE_A }, { id: STORE_B }]) // count active
      .mockResolvedValueOnce([{ id: STORE_B }]) // validate pick

    const result = await create(COMPANY_ID, ownerCaller, {
      password: PASSWORD,
      membershipRole: 'USER',
      storeIds: [STORE_B],
    })

    expect(mockUserStoreUpsert).toHaveBeenCalledTimes(1)
    expect(mockUserStoreUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ storeId: STORE_B }),
      }),
    )
    expect(result.storeIds).toEqual([STORE_B])
  })

  it('multi-store with two storeIds → reject (floor must be single-store)', async () => {
    mockStoreFindMany.mockResolvedValue([{ id: STORE_A }, { id: STORE_B }])

    await expect(
      create(COMPANY_ID, ownerCaller, {
        password: PASSWORD,
        membershipRole: 'USER',
        storeIds: [STORE_A, STORE_B],
      }),
    ).rejects.toBeInstanceOf(BadRequestError)

    expect(mockUserCreate).not.toHaveBeenCalled()
  })
})

describe('admin password reset + email attach', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('resetMemberPasswordBodySchema requires new password', () => {
    expect(resetMemberPasswordBodySchema.parse({ password: 'NewPass12' }).password).toBe('NewPass12')
    expect(() => resetMemberPasswordBodySchema.parse({})).toThrow()
  })

  it('admin reset updates hash so only new password works', async () => {
    mockMemberFindUnique.mockResolvedValue({
      id: 'member-1',
      userId: USER_ID,
      membershipRole: 'USER',
      employeeCode: '123456',
    })
    mockUserUpdate.mockResolvedValue({ id: USER_ID })

    await resetMemberPassword(COMPANY_ID, USER_ID, ownerCaller, { password: 'BrandNew99' })

    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: USER_ID },
        data: expect.objectContaining({
          password: expect.any(String),
          failedLoginAttempts: 0,
          lockedUntil: null,
        }),
      }),
    )
    const hashed = mockUserUpdate.mock.calls[0][0].data.password as string
    expect(await bcrypt.compare('BrandNew99', hashed)).toBe(true)
    expect(await bcrypt.compare(PASSWORD, hashed)).toBe(false)
  })

  it('attachMemberEmailBodySchema requires unique email shape', () => {
    expect(attachMemberEmailBodySchema.parse({ email: 'ana@example.com' }).email).toBe('ana@example.com')
    expect(() => attachMemberEmailBodySchema.parse({ email: 'not-an-email' })).toThrow()
  })

  it('attach email sets User.email; member employeeCode unchanged', async () => {
    mockMemberFindUnique.mockResolvedValue({
      id: 'member-1',
      userId: USER_ID,
      membershipRole: 'USER',
      employeeCode: '654321',
    })
    mockUserFindFirst.mockResolvedValue(null)
    mockUserUpdate.mockResolvedValue({
      id: USER_ID,
      email: 'ana@example.com',
      firstName: 'Ana',
      lastName: 'Caja',
    })

    const result = await attachMemberEmail(COMPANY_ID, USER_ID, ownerCaller, {
      email: 'ana@example.com',
    })

    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: USER_ID },
        data: expect.objectContaining({ email: 'ana@example.com' }),
      }),
    )
    expect(result.email).toBe('ana@example.com')
    expect(result.employeeCode).toBe('654321')
  })

  it('attach email rejects when email already taken', async () => {
    mockMemberFindUnique.mockResolvedValue({
      id: 'member-1',
      userId: USER_ID,
      membershipRole: 'USER',
      employeeCode: '654321',
    })
    mockUserFindFirst.mockResolvedValue({ id: 'other-user' })

    await expect(
      attachMemberEmail(COMPANY_ID, USER_ID, ownerCaller, { email: 'taken@example.com' }),
    ).rejects.toBeInstanceOf(BadRequestError)
  })
})

describe('companies.getCredentials — owner view/copy companyCode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns companyCode for owner/admin of the company', async () => {
    mockCompanyFindUnique.mockResolvedValue({
      id: COMPANY_ID,
      name: 'Demo Co',
      companyCode: 'a1b2c3d4e5f6a7b8',
      isActive: true,
    })

    const result = await getCredentials(COMPANY_ID, ownerCaller)
    expect(result).toEqual({
      companyId: COMPANY_ID,
      companyCode: 'a1b2c3d4e5f6a7b8',
    })
  })
})

describe('register path uses allocateUniqueCompanyCode helper', () => {
  it('auth.service register imports/uses company-code module (source contract)', () => {
    const src = readFileSync(join(__dirname, '../../services/auth.service.ts'), 'utf8')
    expect(src).toMatch(/allocateUniqueCompanyCode/)
    expect(src).not.toMatch(/companyCode:\s*randomBytes\(8\)\.toString\('hex'\)/)
  })

  it('companies controller registers credentials route', () => {
    const src = readFileSync(join(__dirname, '../../controllers/v1/companies.controller.ts'), 'utf8')
    expect(src).toMatch(/\/v1\/companies\/:id\/credentials/)
    expect(src).toMatch(/getCredentials/)
  })

  it('company-members controller registers password reset + email attach routes', () => {
    const src = readFileSync(join(__dirname, '../../controllers/v1/company-members.controller.ts'), 'utf8')
    expect(src).toMatch(/members\/:userId\/password/)
    expect(src).toMatch(/members\/:userId\/email/)
    expect(src).toMatch(/attachEmail/)
  })
})
