import type { CompanyRow, CompanyModules, BusinessType } from './company.js'

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
  /**
   * Whether the selected company's registration wizard is fully complete.
   * Complete iff: Empresa (real name+taxId) + Rubro (businessType) + Local (≥1 store + ≥1 caja).
   * Omitted when no company context is set.
   */
  companyProfileComplete?: boolean
  /**
   * First incomplete wizard step, or omitted when wizard is fully complete.
   * Supersedes the old fiscal-only semantics of `companyProfileComplete`.
   */
  registrationWizardStep?: 'CUENTA' | 'EMPRESA' | 'RUBRO' | 'LOCAL'
}

/** Public POST /v1/auth/login — exactly one of email | userCode. */
export type LoginRequest = {
  email?: string
  userCode?: string
  password: string
  companyId?: string
  captchaToken?: string
}

/**
 * @deprecated Prefer `LoginRequest` with `userCode` via POST /v1/auth/login.
 * Public POST /v1/auth/floor-login — thin alias of code login.
 */
export type FloorLoginRequest = {
  userCode: string
  password: string
  captchaToken?: string
}

/**
 * @deprecated Prefer `LoginResponse` from POST /v1/auth/login.
 * Same success envelope as email/code login (cookies/JWT issued by API).
 */
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
  /**
   * Whether the selected company's registration wizard is fully complete.
   * Complete iff: Empresa (real name+taxId) + Rubro (businessType) + Local (≥1 store + ≥1 caja).
   * Omitted when no company context is set.
   */
  companyProfileComplete?: boolean
  /**
   * First incomplete wizard step, or omitted when wizard is fully complete.
   * Supersedes the old fiscal-only semantics of `companyProfileComplete`.
   */
  registrationWizardStep?: 'CUENTA' | 'EMPRESA' | 'RUBRO' | 'LOCAL'
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
