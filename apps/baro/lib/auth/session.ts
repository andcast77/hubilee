import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  accessCookieOptions,
  clearCookieOptions,
  refreshCookieOptions,
} from '@/lib/auth/cookies'
import { createRefreshTokenValue, hashRefreshToken } from '@/lib/auth/crypto'
import { signAccessToken, verifyAccessToken } from '@/lib/auth/jwt'
import { prisma } from '@/lib/prisma'

/** User id from access JWT cookie, or null if missing/invalid. */
export async function getSessionUserId(): Promise<string | null> {
  const jar = await cookies()
  const token = jar.get(ACCESS_COOKIE)?.value
  const v = await verifyAccessToken(token)
  if (!v.ok) return null
  return v.payload.sub
}

const REFRESH_MS = 7 * 24 * 60 * 60 * 1000

export async function persistRefreshToken(userId: string, refreshRaw: string): Promise<void> {
  const tokenHash = hashRefreshToken(refreshRaw)
  const expiresAt = new Date(Date.now() + REFRESH_MS)
  await prisma.refreshToken.create({
    data: { userId, tokenHash, expiresAt },
  })
}

/** Creates refresh in DB and returns access JWT + raw refresh, or null if JWT secret missing. */
export async function createSessionTokens(
  userId: string,
  email: string
): Promise<{ accessToken: string; refreshRaw: string } | null> {
  const accessToken = await signAccessToken({ sub: userId, email })
  if (!accessToken) return null
  const refreshRaw = createRefreshTokenValue()
  await persistRefreshToken(userId, refreshRaw)
  return { accessToken, refreshRaw }
}

export function setSessionCookies(
  res: NextResponse,
  accessToken: string,
  refreshRaw: string
): void {
  res.cookies.set(ACCESS_COOKIE, accessToken, accessCookieOptions())
  res.cookies.set(REFRESH_COOKIE, refreshRaw, refreshCookieOptions())
}

export function clearSessionCookies(res: NextResponse): void {
  res.cookies.set(ACCESS_COOKIE, '', clearCookieOptions())
  res.cookies.set(REFRESH_COOKIE, '', clearCookieOptions())
}

export async function revokeRefreshByRaw(refreshRaw: string | undefined): Promise<void> {
  if (!refreshRaw) return
  const tokenHash = hashRefreshToken(refreshRaw)
  await prisma.refreshToken.deleteMany({ where: { tokenHash } })
}
