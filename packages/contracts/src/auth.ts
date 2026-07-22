import type { CompanyRow, CompanyModules } from './company.js'

/** Access + refresh pair, only present for desktop (`X-Client: desktop`) requests. */
export type DesktopAuthTokens = {
  accessToken: string
  refreshToken: string
}

/**
 * Session is an httpOnly cookie on web (no token in JSON there).
 * `tokens` is additive and gated: only present when the request carried
 * `X-Client: desktop` (design `sdd/web-desktop-vite-tauri/design` ADR-A1).
 *
 * `user.email` is `string | null` so floor (codes-only) users can share the same envelope.
 */
export type LoginResponse = {
  user: {
    id: string
    email: string | null
    name: string
    role: string
    isSuperuser: boolean
  }
  companyId?: string
  company?: CompanyRow
  companies?: CompanyRow[]
  membershipRole?: string
  /** When true, password was OK but MFA is required — use tempToken with /v1/auth/mfa/verify. */
  mfaRequired?: boolean
  tempToken?: string
  tokens?: DesktopAuthTokens
}

/** Public POST /v1/auth/floor-login body (types only in PR1; route wired in PR2). */
export type FloorLoginRequest = {
  companyCode: string
  employeeCode: string
  password: string
  captchaToken?: string
}

/** Same success envelope as email login (cookies/JWT issued by API). */
export type FloorLoginResponse = LoginResponse

export type RegisterResponse = {
  user: {
    id: string
    email: string | null
    name: string
    role: string
    companyId?: string
  }
  company?: {
    id: string
    name: string
    modules: CompanyModules
  }
  tokens?: DesktopAuthTokens
}

export type MeResponse = {
  id: string
  email: string | null
  role: string
  isActive: boolean
  name: string
  companyId?: string
  preferredCompanyId?: string
  membershipRole?: string
  isSuperuser?: boolean
  twoFactorEnabled?: boolean
  company?: {
    id: string
    name: string
    modules: CompanyModules
  }
}

export type ContextResponse = {
  companyId: string
  /** Rol de membresía en la empresa seleccionada (si aplica). */
  membershipRole?: string | null
}

export type CompaniesResponse = CompanyRow[]

export type ApiResponse<T = unknown> = {
  success: boolean
  data?: T
  error?: string
  message?: string
}
