export const ACCESS_COOKIE = 'baro_access'
export const REFRESH_COOKIE = 'baro_refresh'

/** Must stay aligned with `setExpirationTime` on the access JWT in `lib/auth/jwt.ts`. */
const ACCESS_MAX_AGE = 60 * 30
const REFRESH_MAX_AGE = 60 * 60 * 24 * 7

type CookieOpts = {
  httpOnly: boolean
  sameSite: 'lax'
  path: string
  secure: boolean
}

export function cookieBaseOptions(): CookieOpts {
  const secure = process.env.NODE_ENV === 'production'
  return {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure,
  }
}

export function accessCookieOptions(): CookieOpts & { maxAge: number } {
  return { ...cookieBaseOptions(), maxAge: ACCESS_MAX_AGE }
}

export function refreshCookieOptions(): CookieOpts & { maxAge: number } {
  return { ...cookieBaseOptions(), maxAge: REFRESH_MAX_AGE }
}

export function clearCookieOptions(): CookieOpts & { maxAge: number } {
  return { ...cookieBaseOptions(), maxAge: 0 }
}
