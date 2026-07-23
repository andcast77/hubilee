import { randomBytes } from 'crypto'
import { getRedis } from '../common/cache/redis.js'
import {
  BadRequestError,
  ServiceUnavailableError,
  UnauthorizedError,
} from '../common/errors/app-error.js'
import { generateMfaPendingToken, generateToken, type TokenPayload } from '../core/auth.js'
import { getUserCompanies, selectCompanyForUser } from '../core/auth-context.js'
import { getConfig } from '../core/config.js'
import { assertAllowlistedOrigin } from '../core/cors-reflect.js'
import { findModulesByKeys } from '../core/modules.js'
import { prisma } from '../db/index.js'
import { computeCompanyProfileComplete, type LoginResult } from './auth.service.js'
import { allocateUniqueCompanyCode } from './company-code.js'
import { allocateUniqueUserCode } from './user-code.js'

const OAUTH_STATE_PREFIX = 'oauth:google:'
const OAUTH_STATE_TTL_SECONDS = 600
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo'

export type GoogleOAuthIntent = 'login' | 'register'

export type GoogleUserInfo = {
  sub: string
  email: string
  email_verified: boolean
  given_name?: string
  family_name?: string
  name?: string
}

export type GoogleOAuthDisplay = 'popup' | 'page'

export type GoogleOAuthStatePayload = {
  returnOrigin: string
  intent: GoogleOAuthIntent
  next: string | null
  /** Absent on legacy Redis payloads → treat as page. */
  display: GoogleOAuthDisplay
}

export type GoogleIdentityLinkDecision =
  | { action: 'use_existing'; userId: string }
  | { action: 'auto_link'; userId: string }
  | { action: 'create_user' }
  | { action: 'reject'; reason: 'EMAIL_NOT_VERIFIED' | 'USER_NOT_FOUND' }

export function assertGoogleOAuthConfigured(): void {
  const config = getConfig()
  if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET || !config.GOOGLE_REDIRECT_URI) {
    throw new ServiceUnavailableError(
      'Google OAuth no está configurado.',
      'GOOGLE_OAUTH_DISABLED',
    )
  }
}

/** Same-origin path only (mirror Pos `safeNextPath`). */
export function safeOAuthNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null
  if (!raw.startsWith('/')) return null
  if (raw.startsWith('//')) return null
  return raw
}

export function resolveGoogleIdentityLink(input: {
  emailVerified: boolean
  existingOAuthUserId: string | null
  existingUserByEmailId: string | null
  /** login must not auto-create accounts; register may. */
  intent: GoogleOAuthIntent
}): GoogleIdentityLinkDecision {
  if (input.existingOAuthUserId) {
    return { action: 'use_existing', userId: input.existingOAuthUserId }
  }
  if (!input.emailVerified) {
    return { action: 'reject', reason: 'EMAIL_NOT_VERIFIED' }
  }
  if (input.existingUserByEmailId) {
    return { action: 'auto_link', userId: input.existingUserByEmailId }
  }
  if (input.intent === 'login') {
    return { action: 'reject', reason: 'USER_NOT_FOUND' }
  }
  return { action: 'create_user' }
}

function companyNameFromGoogle(info: GoogleUserInfo): string {
  const fromNames = [info.given_name, info.family_name].filter(Boolean).join(' ').trim()
  if (fromNames) return fromNames
  if (info.name?.trim()) return info.name.trim()
  const local = info.email.split('@')[0]?.trim()
  return local || 'Mi empresa'
}

export async function createGoogleOAuthState(
  payload: GoogleOAuthStatePayload,
): Promise<string> {
  const redis = getRedis()
  if (!redis) {
    throw new ServiceUnavailableError(
      'OAuth no disponible. Configura Upstash Redis (UPSTASH_*).',
      'OAUTH_STORE_UNAVAILABLE',
    )
  }
  const state = randomBytes(32).toString('base64url')
  await redis.set(`${OAUTH_STATE_PREFIX}${state}`, JSON.stringify(payload), {
    ex: OAUTH_STATE_TTL_SECONDS,
  })
  return state
}

export async function consumeGoogleOAuthState(state: string): Promise<GoogleOAuthStatePayload> {
  const redis = getRedis()
  if (!redis) {
    throw new ServiceUnavailableError(
      'OAuth no disponible. Configura Upstash Redis (UPSTASH_*).',
      'OAUTH_STORE_UNAVAILABLE',
    )
  }
  const key = `${OAUTH_STATE_PREFIX}${state}`
  const raw = await redis.get(key)
  await redis.del(key)
  // Upstash REST may auto-deserialize JSON → object; mocks usually return string.
  const parsed = parseOAuthStatePayload(raw)
  if (!parsed) {
    throw new BadRequestError('Estado OAuth inválido o expirado', 'OAUTH_STATE_INVALID')
  }
  return parsed
}

/** Upstash may return JSON as string or already-parsed object. */
function parseOAuthStatePayload(raw: unknown): GoogleOAuthStatePayload | null {
  if (raw == null) return null
  let value: unknown = raw
  if (typeof raw === 'string') {
    if (!raw) return null
    try {
      value = JSON.parse(raw)
    } catch {
      return null
    }
  }
  if (!value || typeof value !== 'object') return null
  const obj = value as Record<string, unknown>
  if (typeof obj.returnOrigin !== 'string') return null
  if (obj.intent !== 'login' && obj.intent !== 'register') return null
  const next =
    obj.next === null || obj.next === undefined
      ? null
      : typeof obj.next === 'string'
        ? obj.next
        : null
  const display: GoogleOAuthDisplay = obj.display === 'popup' ? 'popup' : 'page'
  return {
    returnOrigin: obj.returnOrigin,
    intent: obj.intent,
    next,
    display,
  }
}

export function buildGoogleAuthorizeUrl(state: string): string {
  assertGoogleOAuthConfigured()
  const config = getConfig()
  const url = new URL(GOOGLE_AUTH_URL)
  url.searchParams.set('client_id', config.GOOGLE_CLIENT_ID)
  url.searchParams.set('redirect_uri', config.GOOGLE_REDIRECT_URI)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', 'openid email profile')
  url.searchParams.set('state', state)
  url.searchParams.set('access_type', 'online')
  url.searchParams.set('prompt', 'select_account')
  return url.toString()
}

export async function startGoogleOAuth(params: {
  returnOrigin: string
  intent?: string
  next?: string | null
  display?: string | null
}): Promise<{ authorizeUrl: string }> {
  assertGoogleOAuthConfigured()
  const returnOrigin = assertAllowlistedOrigin(params.returnOrigin)
  const intent: GoogleOAuthIntent = params.intent === 'register' ? 'register' : 'login'
  const next = safeOAuthNextPath(params.next ?? null)
  const display: GoogleOAuthDisplay = params.display === 'popup' ? 'popup' : 'page'
  const state = await createGoogleOAuthState({ returnOrigin, intent, next, display })
  return { authorizeUrl: buildGoogleAuthorizeUrl(state) }
}

export async function exchangeGoogleCode(code: string): Promise<string> {
  assertGoogleOAuthConfigured()
  const config = getConfig()
  const body = new URLSearchParams({
    code,
    client_id: config.GOOGLE_CLIENT_ID,
    client_secret: config.GOOGLE_CLIENT_SECRET,
    redirect_uri: config.GOOGLE_REDIRECT_URI,
    grant_type: 'authorization_code',
  })
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) {
    throw new UnauthorizedError('No se pudo validar el código de Google', 'GOOGLE_TOKEN_EXCHANGE_FAILED')
  }
  const data = (await res.json()) as { access_token?: string }
  if (!data.access_token) {
    throw new UnauthorizedError('No se pudo validar el código de Google', 'GOOGLE_TOKEN_EXCHANGE_FAILED')
  }
  return data.access_token
}

export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    throw new UnauthorizedError('No se pudo obtener el perfil de Google', 'GOOGLE_USERINFO_FAILED')
  }
  const data = (await res.json()) as Partial<GoogleUserInfo>
  if (!data.sub || !data.email) {
    throw new UnauthorizedError('Perfil de Google incompleto', 'GOOGLE_USERINFO_INCOMPLETE')
  }
  return {
    sub: data.sub,
    email: data.email,
    email_verified: data.email_verified === true,
    given_name: data.given_name,
    family_name: data.family_name,
    name: data.name,
  }
}

export async function resolveOrCreateGoogleUser(
  info: GoogleUserInfo,
  intent: GoogleOAuthIntent,
): Promise<{
  userId: string
  created: boolean
  linked: boolean
}> {
  const email = info.email.trim().toLowerCase()
  const existingOAuth = await prisma.oAuthAccount.findUnique({
    where: {
      provider_providerAccountId: { provider: 'google', providerAccountId: info.sub },
    },
    select: { userId: true },
  })
  const existingByEmail = await prisma.user.findFirst({
    where: { email },
    select: { id: true },
  })

  const decision = resolveGoogleIdentityLink({
    emailVerified: info.email_verified === true,
    existingOAuthUserId: existingOAuth?.userId ?? null,
    existingUserByEmailId: existingByEmail?.id ?? null,
    intent,
  })

  if (decision.action === 'reject') {
    if (decision.reason === 'USER_NOT_FOUND') {
      throw new BadRequestError(
        'No hay una cuenta asociada a ese mail.',
        'USER_NOT_FOUND',
      )
    }
    throw new BadRequestError(
      'El email de Google no está verificado.',
      'GOOGLE_EMAIL_NOT_VERIFIED',
    )
  }

  if (decision.action === 'use_existing') {
    return { userId: decision.userId, created: false, linked: false }
  }

  if (decision.action === 'auto_link') {
    await prisma.oAuthAccount.create({
      data: {
        provider: 'google',
        providerAccountId: info.sub,
        userId: decision.userId,
      },
    })
    return { userId: decision.userId, created: false, linked: true }
  }

  const firstName = info.given_name?.trim() || email.split('@')[0] || 'User'
  const lastName = info.family_name?.trim() || ''
  const userCode = await allocateUniqueUserCode()
  const user = await prisma.user.create({
    data: {
      email,
      userCode,
      password: null,
      firstName,
      lastName,
      role: 'USER',
      isActive: true,
      isSuperuser: false,
      emailVerified: true,
    },
    select: { id: true },
  })
  await prisma.oAuthAccount.create({
    data: {
      provider: 'google',
      providerAccountId: info.sub,
      userId: user.id,
    },
  })
  return { userId: user.id, created: true, linked: true }
}

export async function ensureCompanyForRegisterIntent(params: {
  userId: string
  companyName: string
}): Promise<string> {
  const existing = await prisma.companyMember.findFirst({
    where: { userId: params.userId },
    select: { companyId: true },
    orderBy: { createdAt: 'asc' },
  })
  if (existing) return existing.companyId

  const modulesMap = await findModulesByKeys(['hr', 'pos', 'tech'])
  const posMod = modulesMap.get('pos')
  const companyCode = await allocateUniqueCompanyCode()

  const company = await prisma.$transaction(async (tx) => {
    const c = await tx.company.create({
      data: {
        name: params.companyName.trim() || 'Mi empresa',
        companyCode,
        ownerUserId: params.userId,
        isActive: true,
      },
    })
    await tx.companyMember.create({
      data: { userId: params.userId, companyId: c.id, membershipRole: 'OWNER' },
    })
    if (posMod) {
      await tx.companyModule.create({
        data: { companyId: c.id, moduleId: posMod.id, enabled: true },
      })
    }
    const role =
      (await tx.role.findFirst({ where: { name: 'admin', companyId: c.id } })) ??
      (await tx.role.create({ data: { name: 'admin', companyId: c.id } }))
    await tx.userRoleAssignment.create({
      data: { userId: params.userId, roleId: role.id, companyId: c.id },
    })
    return c
  })

  return company.id
}

async function buildLoginResultForUser(userId: string): Promise<LoginResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      isSuperuser: true,
      firstName: true,
      lastName: true,
      posPreferredCompanyId: true,
      twoFactorEnabled: true,
    },
  })
  if (!user || !user.isActive) {
    throw new UnauthorizedError('Usuario inactivo')
  }

  const companies = await getUserCompanies(user.id, user.isSuperuser ?? false)
  const selected = selectCompanyForUser(companies, user.posPreferredCompanyId ?? undefined)
  const selectedCompany = selected?.selectedCompany ?? null
  const selectedMembershipRole = selected?.selectedMembershipRole ?? null
  const name =
    [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
    user.email ||
    ''

  if (user.twoFactorEnabled) {
    const tempToken = generateMfaPendingToken(user.id)
    const mfaResult: LoginResult = {
      mfaRequired: true,
      tempToken,
      user: {
        id: user.id,
        email: user.email,
        name,
        role: user.role,
        isSuperuser: user.isSuperuser ?? false,
      },
    }
    if (selectedCompany) {
      mfaResult.companyId = selectedCompany.id
      mfaResult.company = selectedCompany
      if (selectedMembershipRole) mfaResult.membershipRole = selectedMembershipRole
      // Compute companyProfileComplete for the selected company
      mfaResult.companyProfileComplete = await computeCompanyProfileComplete(selectedCompany.id)
    }
    if (companies.length > 1 || user.isSuperuser) {
      mfaResult.companies = companies
    }
    return mfaResult
  }

  const tokenPayload: TokenPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
    isSuperuser: user.isSuperuser ?? false,
  }
  if (selectedCompany) {
    tokenPayload.companyId = selectedCompany.id
    if (selectedMembershipRole) tokenPayload.membershipRole = selectedMembershipRole
  }
  const token = generateToken(tokenPayload)
  const result: LoginResult = {
    user: {
      id: user.id,
      email: user.email,
      name,
      role: user.role,
      isSuperuser: user.isSuperuser ?? false,
    },
    token,
  }
  if (selectedCompany) {
    result.companyId = selectedCompany.id
    result.company = selectedCompany
    if (selectedMembershipRole) result.membershipRole = selectedMembershipRole
    // Compute companyProfileComplete for the selected company
    result.companyProfileComplete = await computeCompanyProfileComplete(selectedCompany.id)
  }
  if (companies.length > 1 || user.isSuperuser) {
    result.companies = companies
  }
  return result
}

export type GoogleCallbackOutcome =
  | {
      kind: 'session'
      login: Extract<LoginResult, { token: string }>
      returnOrigin: string
      next: string | null
      display: GoogleOAuthDisplay
    }
  | {
      kind: 'mfa'
      tempToken: string
      returnOrigin: string
      display: GoogleOAuthDisplay
    }
  | {
      kind: 'error'
      returnOrigin: string | null
      code: string
      display: GoogleOAuthDisplay
    }

export async function completeGoogleOAuthCallback(params: {
  code: string | undefined
  state: string | undefined
}): Promise<GoogleCallbackOutcome> {
  let returnOrigin: string | null = null
  let display: GoogleOAuthDisplay = 'page'
  try {
    if (!params.code?.trim() || !params.state?.trim()) {
      throw new BadRequestError('Callback OAuth incompleto', 'OAUTH_CALLBACK_INVALID')
    }
    assertGoogleOAuthConfigured()
    const statePayload = await consumeGoogleOAuthState(params.state.trim())
    returnOrigin = statePayload.returnOrigin
    display = statePayload.display

    const accessToken = await exchangeGoogleCode(params.code.trim())
    const info = await fetchGoogleUserInfo(accessToken)
    const { userId } = await resolveOrCreateGoogleUser(info, statePayload.intent)

    if (statePayload.intent === 'register') {
      await ensureCompanyForRegisterIntent({
        userId,
        companyName: companyNameFromGoogle(info),
      })
    }

    const login = await buildLoginResultForUser(userId)
    if ('mfaRequired' in login && login.mfaRequired) {
      return {
        kind: 'mfa',
        tempToken: login.tempToken,
        returnOrigin: statePayload.returnOrigin,
        display: statePayload.display,
      }
    }
    return {
      kind: 'session',
      login: login as Extract<LoginResult, { token: string }>,
      returnOrigin: statePayload.returnOrigin,
      next: statePayload.next,
      display: statePayload.display,
    }
  } catch (err) {
    const code =
      err instanceof BadRequestError ||
      err instanceof UnauthorizedError ||
      err instanceof ServiceUnavailableError
        ? (err.code ?? 'OAUTH_ERROR')
        : 'OAUTH_ERROR'
    return { kind: 'error', returnOrigin, code, display }
  }
}
