import { verifyAccessToken } from '@/lib/auth/jwt'

export { ACCESS_COOKIE, REFRESH_COOKIE } from '@/lib/auth/cookies'

export function isAuthEnabled(): boolean {
  return process.env.AUTH_ENABLED === 'true'
}

/** Validates access JWT from cookie value (Edge-safe). */
export async function isAuthenticatedRequest(
  accessCookieValue: string | undefined
): Promise<boolean> {
  const v = await verifyAccessToken(accessCookieValue)
  return v.ok
}
