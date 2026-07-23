/**
 * Every successful web session issue revokes prior sessions (one session per user).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockUserFindUnique = vi.hoisted(() => vi.fn())
const mockSessionFindMany = vi.hoisted(() => vi.fn())
const mockSessionDeleteMany = vi.hoisted(() => vi.fn())
const mockSessionCreate = vi.hoisted(() => vi.fn())
const mockBlacklistJtis = vi.hoisted(() => vi.fn(async () => {}))

vi.mock('../../db/index.js', () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    session: {
      findMany: mockSessionFindMany,
      deleteMany: mockSessionDeleteMany,
      create: mockSessionCreate,
    },
  },
}))

vi.mock('../../core/jwt-blacklist.js', () => ({
  blacklistJti: vi.fn(async () => {}),
  blacklistJtis: (...args: unknown[]) => mockBlacklistJtis(...args),
  isJtiBlacklisted: vi.fn(async () => false),
}))

vi.mock('../../core/config.js', () => ({
  getConfig: () => ({
    JWT_ACCESS_EXPIRES_IN: '15m',
    REFRESH_TOKEN_EXPIRES_IN: '7d',
  }),
}))

import { createWebSessionPair } from '../../services/auth.service.js'

const USER_ID = '33333333-3333-3333-3333-333333333333'

function accessJwt(jti = 'new-jti'): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({ jti })).toString('base64url')
  return `${header}.${payload}.x`
}

describe('createWebSessionPair', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSessionFindMany.mockResolvedValue([{ accessJti: 'old-jti' }])
    mockSessionDeleteMany.mockResolvedValue({ count: 1 })
    mockSessionCreate.mockResolvedValue({ id: 'sess-1' })
  })

  it('replaces prior sessions for codes-only / floor roles', async () => {
    mockUserFindUnique.mockResolvedValue({ id: USER_ID, role: 'CASHIER' })

    await expect(
      createWebSessionPair(USER_ID, accessJwt(), { companyId: 'c1' }, { ipAddress: null, userAgent: null }),
    ).resolves.toMatchObject({ refreshPlain: expect.any(String) })

    expect(mockBlacklistJtis).toHaveBeenCalled()
    expect(mockSessionDeleteMany).toHaveBeenCalledWith({ where: { userId: USER_ID } })
    expect(mockSessionCreate).toHaveBeenCalled()
  })

  it('revokes prior sessions for ADMIN (single session all roles)', async () => {
    mockUserFindUnique.mockResolvedValue({ id: USER_ID, role: 'ADMIN' })

    await expect(
      createWebSessionPair(USER_ID, accessJwt(), {}, { ipAddress: null, userAgent: null }),
    ).resolves.toMatchObject({ refreshPlain: expect.any(String) })

    expect(mockBlacklistJtis).toHaveBeenCalledWith(['old-jti'], expect.any(Number))
    expect(mockSessionDeleteMany).toHaveBeenCalledWith({ where: { userId: USER_ID } })
    expect(mockSessionCreate).toHaveBeenCalled()
  })

  it('revokes prior sessions for SUPERADMIN', async () => {
    mockUserFindUnique.mockResolvedValue({ id: USER_ID, role: 'SUPERADMIN' })

    await expect(
      createWebSessionPair(USER_ID, accessJwt(), {}, { ipAddress: null, userAgent: null }),
    ).resolves.toMatchObject({ refreshPlain: expect.any(String) })

    expect(mockSessionDeleteMany).toHaveBeenCalledWith({ where: { userId: USER_ID } })
    expect(mockBlacklistJtis).toHaveBeenCalled()
  })
})
