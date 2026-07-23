import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../db/index.js'
import {
  generateToken,
  generateMfaPendingToken,
  verifyMfaPendingToken,
  verifyToken,
  accessTokenTtlSeconds,
  type TokenPayload,
} from '../core/auth.js'
import { getConfig } from '../core/config.js'
import { hashRefreshToken, generateRefreshTokenPlain } from '../core/refresh-token.js'
import { blacklistJti, blacklistJtis, isJtiBlacklisted } from '../core/jwt-blacklist.js'
import { getUserCompanies, selectCompanyForUser } from '../core/auth-context.js'
import { findModulesByKeys, getCompanyModules } from '../core/modules.js'
import type { LoginBody, RegisterBody, ChangePasswordBody, FloorLoginBody } from '../dto/auth.dto.js'
import { verifyAndConsumeRegistrationTicket } from './registration-ticket.service.js'
import { allocateUniqueCompanyCode } from './company-code.js'
import { allocateUniqueUserCode } from './user-code.js'
import type { CompanyRow } from '../core/auth-context.js'
import {
  UnauthorizedError,
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
  TooManyRequestsError,
} from '../common/errors/app-error.js'
import { assertSelfOrSuperuser, resolveCompanyAccess } from '../policies/company-authorization.policy.js'
import {
  decryptTotpSecret,
  verifyTotp,
  verifyBackupCodeAndConsume,
} from './mfa.service.js'
import { writeAuditLog } from './audit-log.service.js'
import { summarizeUserAgent } from '../core/user-agent-summary.js'
import { jwtExpiresInToMaxAgeSeconds } from '../core/session-cookie.js'
import { verifyTurnstileToken } from './turnstile.service.js'

async function resolveAuditCompanyId(userId: string, bodyCompanyId?: string): Promise<string | null> {
  if (bodyCompanyId) return bodyCompanyId
  const m = await prisma.companyMember.findFirst({
    where: { userId },
    select: { companyId: true },
    orderBy: { createdAt: 'asc' },
  })
  return m?.companyId ?? null
}

function refreshSessionExpiresAt(): Date {
  const ms = jwtExpiresInToMaxAgeSeconds(getConfig().REFRESH_TOKEN_EXPIRES_IN) * 1000
  return new Date(Date.now() + ms)
}

type LockoutUserFields = {
  id: string
  failedLoginAttempts: number
  lockedUntil: Date | null
}

/** Throws ACCOUNT_LOCKED when lockedUntil is still in the future. */
function assertNotLocked(user: Pick<LockoutUserFields, 'lockedUntil'>, now = new Date()): void {
  if (user.lockedUntil && user.lockedUntil > now) {
    const retrySec = Math.ceil((user.lockedUntil.getTime() - now.getTime()) / 1000)
    throw new TooManyRequestsError(
      'Cuenta bloqueada por demasiados intentos fallidos. Inténtalo más tarde.',
      retrySec,
      'ACCOUNT_LOCKED',
    )
  }
}

/**
 * Bumps failedLoginAttempts / lockedUntil on bad password.
 * Throws ACCOUNT_LOCKED when threshold reached, otherwise UnauthorizedError.
 */
async function recordFailedPasswordAttempt(
  user: LockoutUserFields,
  auditCompanyId: string | null,
  now = new Date(),
): Promise<never> {
  const config = getConfig()
  const attempts = user.failedLoginAttempts + 1
  const lockUntil =
    attempts >= config.MAX_LOGIN_ATTEMPTS
      ? new Date(now.getTime() + config.LOCKOUT_DURATION_MINUTES * 60 * 1000)
      : null
  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: attempts,
      lockedUntil: lockUntil,
    },
  })
  writeAuditLog({
    companyId: auditCompanyId,
    userId: user.id,
    action: 'LOGIN_FAILED',
    entityType: 'auth',
    entityId: user.id,
  })
  if (lockUntil) {
    writeAuditLog({
      companyId: auditCompanyId,
      userId: user.id,
      action: 'ACCOUNT_LOCKED',
      entityType: 'auth',
      entityId: user.id,
      after: { lockedUntil: lockUntil.toISOString(), attempts },
    })
    const retrySec = Math.ceil(config.LOCKOUT_DURATION_MINUTES * 60)
    throw new TooManyRequestsError(
      'Cuenta bloqueada por demasiados intentos fallidos. Inténtalo más tarde.',
      retrySec,
      'ACCOUNT_LOCKED',
    )
  }
  throw new UnauthorizedError('Credenciales inválidas')
}

async function clearLoginLockout(userId: string, wasLocked: boolean, auditCompanyId: string | null): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { failedLoginAttempts: 0, lockedUntil: null },
  })
  if (wasLocked) {
    writeAuditLog({
      companyId: auditCompanyId,
      userId,
      action: 'ACCOUNT_UNLOCKED',
      entityType: 'auth',
      entityId: userId,
    })
  }
}

/** Revoke all Session rows for a user (floor login: one cashier / one terminal). */
async function revokeAllUserSessions(userId: string): Promise<void> {
  const others = await prisma.session.findMany({
    where: { userId },
    select: { accessJti: true },
  })
  const accessMaxSec = jwtExpiresInToMaxAgeSeconds(getConfig().JWT_ACCESS_EXPIRES_IN)
  await blacklistJtis(
    others.map((o) => o.accessJti),
    accessMaxSec,
  )
  await prisma.session.deleteMany({ where: { userId } })
}

export function accessJtiFromJwtString(accessToken: string): string | null {
  const decoded = jwt.decode(accessToken) as { jti?: string } | null
  return typeof decoded?.jti === 'string' ? decoded.jti : null
}

export type LoginResult =
  | {
      mfaRequired: true
      tempToken: string
      user: { id: string; email: string | null; name: string; role: string; isSuperuser: boolean }
      companyId?: string
      company?: CompanyRow
      companies?: CompanyRow[]
      membershipRole?: string
    }
  | {
      mfaRequired?: false
      user: { id: string; email: string | null; name: string; role: string; isSuperuser: boolean }
      token: string
      companyId?: string
      company?: CompanyRow
      companies?: CompanyRow[]
      membershipRole?: string
    }

export type RegisterResult = {
  user: {
    id: string
    email: string | null
    name: string
    role: string
    companyId?: string
    /** Globally unique login id (owner can use code or email). */
    userCode?: string
  }
  token: string
  company?: {
    id: string
    name: string
    modules: { hr: boolean; pos: boolean; tech: boolean }
    /** Opaque company identifier (not required for login). */
    companyCode: string
  }
}

export type MeResult = {
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
  company?: { id: string; name: string; modules: { hr: boolean; pos: boolean; tech: boolean } }
}

const loginUserSelect = {
  id: true,
  email: true,
  userCode: true,
  password: true,
  role: true,
  isActive: true,
  isSuperuser: true,
  firstName: true,
  lastName: true,
  posPreferredCompanyId: true,
  twoFactorEnabled: true,
  failedLoginAttempts: true,
  lockedUntil: true,
} as const

/**
 * Unified login: userCode+password (all users) or email+password (when email is set).
 * userCode path: Turnstile after failed attempts; deny if OPEN CashSession;
 * revoke other sessions for codes-only (null email) users.
 */
export async function login(body: LoginBody): Promise<LoginResult> {
  const { password, companyId: bodyCompanyId, captchaToken } = body
  const viaCode = Boolean(body.userCode?.trim())
  const now = new Date()

  const user = viaCode
    ? await prisma.user.findUnique({
        where: { userCode: body.userCode!.trim() },
        select: loginUserSelect,
      })
    : await prisma.user.findFirst({
        where: { email: body.email!.trim().toLowerCase() },
        select: loginUserSelect,
      })

  if (!user) throw new UnauthorizedError('Credenciales inválidas')
  // Email path must not authenticate codes-only accounts (they have null email).
  if (!viaCode && user.email == null) throw new UnauthorizedError('Credenciales inválidas')

  assertNotLocked(user, now)

  if (!user.isActive) throw new UnauthorizedError('Usuario inactivo')

  if (viaCode && user.failedLoginAttempts >= 1) {
    const cap = captchaToken?.trim()
    if (!cap) {
      throw new BadRequestError('Captcha requerido', 'CAPTCHA_FAILED')
    }
    await verifyTurnstileToken(cap)
  }

  if (user.password == null) {
    throw new UnauthorizedError('Credenciales inválidas')
  }

  const isValidPassword = await bcrypt.compare(password, user.password)
  if (!isValidPassword) {
    const auditCo = await resolveAuditCompanyId(user.id, bodyCompanyId)
    await recordFailedPasswordAttempt(user, auditCo, now)
  }

  if (viaCode) {
    const openCash = await prisma.cashSession.findFirst({
      where: { openedByUserId: user.id, status: 'OPEN' },
      select: { id: true },
    })
    if (openCash) {
      throw new ConflictError(
        'Tienes una caja abierta. Ciérrala antes de iniciar sesión en otro terminal.',
        'CASH_SESSION_OPEN',
      )
    }
  }

  const wasLocked = user.lockedUntil != null
  const auditCoClear = await resolveAuditCompanyId(user.id, bodyCompanyId)
  await clearLoginLockout(user.id, wasLocked, auditCoClear)

  // One terminal for codes-only floor staff.
  if (viaCode && user.email == null) {
    await revokeAllUserSessions(user.id)
  }

  const companies = await getUserCompanies(user.id, user.isSuperuser ?? false)
  const preferredCompanyId = bodyCompanyId ?? user.posPreferredCompanyId ?? undefined
  const selected = selectCompanyForUser(companies, preferredCompanyId)
  const selectedCompany = selected?.selectedCompany ?? null
  const selectedMembershipRole = selected?.selectedMembershipRole ?? null

  const name =
    [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
    user.email ||
    `Usuario ${user.userCode}`

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
  }
  if (companies.length > 1 || user.isSuperuser) {
    result.companies = companies
  }

  return result
}

/** Alias: code+password login via POST /v1/auth/floor-login. */
export async function floorLogin(body: FloorLoginBody): Promise<LoginResult> {
  return login({
    userCode: body.userCode,
    password: body.password,
    captchaToken: body.captchaToken,
  })
}

export type MfaVerifyBody = {
  tempToken: string
  companyId?: string
  totpCode?: string
  backupCode?: string
}

export type CompleteMfaLoginResult = {
  login: Extract<LoginResult, { token: string }>
  mfaUsedBackup: boolean
}

/**
 * Completes login after MFA: validates pending JWT and TOTP or backup code, returns full session (with token).
 */
export async function completeMfaLogin(body: MfaVerifyBody): Promise<CompleteMfaLoginResult> {
  const pending = verifyMfaPendingToken(body.tempToken)
  if (!pending) throw new UnauthorizedError('Sesión MFA inválida o expirada')

  const totp = body.totpCode?.trim()
  const backup = body.backupCode?.trim()
  if (!totp && !backup) throw new BadRequestError('Código TOTP o código de respaldo requerido')
  if (totp && backup) throw new BadRequestError('Envía solo un tipo de código')

  const user = await prisma.user.findUnique({
    where: { id: pending.userId },
    select: {
      id: true,
      email: true,
      password: true,
      role: true,
      isActive: true,
      isSuperuser: true,
      firstName: true,
      lastName: true,
      posPreferredCompanyId: true,
      twoFactorEnabled: true,
      twoFactorSecret: true,
    },
  })

  if (!user) throw new UnauthorizedError('Credenciales inválidas')
  if (!user.isActive) throw new UnauthorizedError('Usuario inactivo')
  if (!user.twoFactorEnabled || !user.twoFactorSecret) {
    throw new BadRequestError('MFA no está activo para esta cuenta')
  }

  let secondFactorOk = false
  let usedBackup = false

  if (totp) {
    try {
      const rawSecret = decryptTotpSecret(user.twoFactorSecret)
      secondFactorOk = verifyTotp(rawSecret, totp)
    } catch {
      secondFactorOk = false
    }
  } else if (backup) {
    secondFactorOk = await verifyBackupCodeAndConsume(user.id, backup)
    usedBackup = secondFactorOk
  }

  if (!secondFactorOk) throw new UnauthorizedError('Código inválido')

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lockedUntil: null },
  })

  const companies = await getUserCompanies(user.id, user.isSuperuser ?? false)
  const preferredCompanyId = body.companyId ?? user.posPreferredCompanyId ?? undefined
  const selected = selectCompanyForUser(companies, preferredCompanyId)
  const selectedCompany = selected?.selectedCompany ?? null
  const selectedMembershipRole = selected?.selectedMembershipRole ?? null

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

  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email || 'Usuario'

  const result: Extract<LoginResult, { token: string }> = {
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
  }
  if (companies.length > 1 || user.isSuperuser) {
    result.companies = companies
  }

  return { login: result, mfaUsedBackup: usedBackup }
}

export async function register(body: RegisterBody): Promise<RegisterResult> {
  const {
    email: rawEmail,
    password,
    firstName = '',
    lastName = '',
    companyName,
    hrEnabled = true,
    posEnabled = false,
    technicalServicesEnabled = false,
  } = body
  const email = rawEmail.trim().toLowerCase()

  const existing = await prisma.user.findFirst({ where: { email }, select: { id: true } })
  if (existing) throw new BadRequestError('Ya existe un usuario con este email')

  const hashedPassword = await bcrypt.hash(password, 10)

  if (companyName && companyName.trim()) {
    const cfg = getConfig()
    const ticket = body.registrationTicket
    if (!ticket?.trim()) {
      throw new BadRequestError(
        'Se requiere verificación por email antes de registrar la empresa.',
        'REGISTRATION_TICKET_REQUIRED',
      )
    }
    await verifyAndConsumeRegistrationTicket(cfg, email, ticket)

    const modulesMap = await findModulesByKeys(['hr', 'pos', 'tech'])
    const hrMod = modulesMap.get('hr')
    const posMod = modulesMap.get('pos')
    const techMod = modulesMap.get('tech')
    const companyCode = await allocateUniqueCompanyCode()
    const userCode = await allocateUniqueUserCode()

    const { user, company } = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          email,
          userCode,
          password: hashedPassword,
          firstName,
          lastName,
          role: 'USER',
          isActive: true,
          isSuperuser: false,
          emailVerified: true,
        },
      })

      const c = await tx.company.create({
        data: {
          name: companyName.trim(),
          ownerUserId: u.id,
          isActive: true,
          companyCode,
        },
      })

      await tx.companyMember.create({
        data: { userId: u.id, companyId: c.id, membershipRole: 'OWNER' },
      })

      const moduleIds: string[] = []
      if (hrEnabled && hrMod) moduleIds.push(hrMod.id)
      if (posEnabled && posMod) moduleIds.push(posMod.id)
      if (technicalServicesEnabled && techMod) moduleIds.push(techMod.id)
      for (const modId of moduleIds) {
        await tx.companyModule.create({
          data: { companyId: c.id, moduleId: modId, enabled: true },
        })
      }

      const role =
        (await tx.role.findFirst({ where: { name: 'admin', companyId: c.id } })) ??
        (await tx.role.create({ data: { name: 'admin', companyId: c.id } }))

      await tx.userRoleAssignment.create({
        data: { userId: u.id, roleId: role.id, companyId: c.id },
      })

      return { user: u, company: c }
    })

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: company.id,
      isSuperuser: false,
      membershipRole: 'OWNER',
    })

    const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email || email

    return {
      user: {
        id: user.id,
        email: user.email ?? email,
        name,
        role: user.role,
        companyId: company.id,
        userCode: user.userCode,
      },
      token,
      company: {
        id: company.id,
        name: company.name,
        modules: { hr: hrEnabled, pos: posEnabled, tech: technicalServicesEnabled },
        companyCode: company.companyCode,
      },
    }
  }

  const userCode = await allocateUniqueUserCode()
  const user = await prisma.user.create({
    data: {
      email,
      userCode,
      password: hashedPassword,
      firstName,
      lastName,
      role: 'USER',
      isActive: true,
      isSuperuser: false,
    },
  })

  const token = generateToken({
    id: user.id,
    email: user.email ?? email,
    role: user.role,
  })

  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email || email

  return {
    user: { id: user.id, email: user.email ?? email, name, role: user.role },
    token,
  }
}

export async function me(decoded: TokenPayload): Promise<MeResult> {
  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      firstName: true,
      lastName: true,
      posPreferredCompanyId: true,
      twoFactorEnabled: true,
    },
  })

  if (!user) throw new NotFoundError('Usuario no encontrado')
  if (!user.isActive) throw new UnauthorizedError('Usuario inactivo')

  let preferredCompanyId: string | null = user.posPreferredCompanyId

  if (!preferredCompanyId) {
    const companies = await getUserCompanies(decoded.id, decoded.isSuperuser ?? false)
    const defaultCompanyId = companies[0]?.id ?? null
    if (defaultCompanyId) {
      await prisma.user.update({
        where: { id: decoded.id },
        data: { posPreferredCompanyId: defaultCompanyId },
      })
      preferredCompanyId = defaultCompanyId
    }
  }

  let company: { id: string; name: string; modules: { hr: boolean; pos: boolean; tech: boolean } } | null = null
  let responseCompanyId: string | undefined = decoded.companyId

  if (decoded.companyId) {
    const c = await prisma.company.findFirst({
      where: { id: decoded.companyId, isActive: true },
    })
    if (c) {
      const modules = await getCompanyModules(c.id)
      company = { id: c.id, name: c.name, modules }
    }
  }

  if (!responseCompanyId || !company) {
    const effectiveId = preferredCompanyId ?? undefined
    if (effectiveId) {
      responseCompanyId = effectiveId
      const c = await prisma.company.findFirst({
        where: { id: effectiveId, isActive: true },
      })
      if (c) {
        const modules = await getCompanyModules(c.id)
        company = { id: c.id, name: c.name, modules }
      }
    }
  }

  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email || 'Usuario'

  return {
    ...user,
    name,
    companyId: responseCompanyId,
    preferredCompanyId: preferredCompanyId ?? undefined,
    membershipRole: decoded.membershipRole,
    isSuperuser: decoded.isSuperuser,
    twoFactorEnabled: user.twoFactorEnabled,
    company: company ?? undefined,
  }
}

export async function verify(token: string): Promise<{ valid: true; user: TokenPayload }> {
  if (!token) throw new BadRequestError('Token es requerido')
  const decoded = verifyToken(token)
  if (!decoded) throw new UnauthorizedError('Token inválido o expirado')
  if (decoded.jti && (await isJtiBlacklisted(decoded.jti))) {
    throw new UnauthorizedError('Token inválido o expirado')
  }
  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
    select: { id: true, isActive: true },
  })
  if (!user || !user.isActive) throw new UnauthorizedError('Usuario no encontrado o inactivo')
  return { valid: true, user: decoded }
}

export async function getCompanies(userId: string, isSuperuser: boolean) {
  return getUserCompanies(userId, isSuperuser)
}

export type SetContextResult = {
  token: string
  companyId: string
  membershipRole: string | null
  company: { id: string; name: string; modules: { hr: boolean; pos: boolean; tech: boolean } } | null
}

export async function setContext(
  decoded: TokenPayload,
  companyId: string
): Promise<SetContextResult> {
  const { allowed, membershipRole } = await resolveCompanyAccess(decoded.id, companyId, decoded.isSuperuser)
  if (!allowed) throw new ForbiddenError('No tienes acceso a esta empresa')
  const token = generateToken({
    id: decoded.id,
    email: decoded.email,
    role: decoded.role,
    companyId,
    isSuperuser: decoded.isSuperuser,
    membershipRole: membershipRole ?? undefined,
  })
  await prisma.user.update({
    where: { id: decoded.id },
    data: { posPreferredCompanyId: companyId },
  })
  const company = await prisma.company.findFirst({
    where: { id: companyId, isActive: true },
  })
  const companyWithModules = company
    ? { id: company.id, name: company.name, modules: await getCompanyModules(company.id) }
    : null
  return { token, companyId, membershipRole: membershipRole ?? null, company: companyWithModules }
}

function allowsConcurrentSessions(role: string): boolean {
  return role === 'ADMIN' || role === 'SUPERADMIN'
}

export async function createWebSessionPair(
  userId: string,
  accessToken: string,
  ctx: { companyId?: string; membershipRole?: string },
  meta: { ipAddress?: string | null; userAgent?: string | null }
): Promise<{ refreshPlain: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId, isActive: true },
    select: { id: true, role: true },
  })
  if (!user) throw new NotFoundError('Usuario no encontrado')
  // Floor roles: one active session — new login/OAuth replaces prior (kick), not 409.
  if (!allowsConcurrentSessions(user.role)) {
    await revokeAllUserSessions(userId)
  }
  const refreshPlain = generateRefreshTokenPlain()
  const sessionToken = hashRefreshToken(refreshPlain)
  const accessJti = accessJtiFromJwtString(accessToken)
  await prisma.session.create({
    data: {
      userId,
      sessionToken,
      accessJti,
      lastSeenAt: new Date(),
      ipAddress: meta.ipAddress ?? null,
      userAgent: meta.userAgent ?? null,
      expiresAt: refreshSessionExpiresAt(),
      companyId: ctx.companyId ?? null,
      membershipRole: ctx.membershipRole ?? null,
    },
  })
  return { refreshPlain }
}

export async function rotateAccessForCurrentRefreshSession(
  userId: string,
  refreshPlain: string,
  previousAccessToken: string,
  newAccessToken: string,
  ctx: { companyId?: string; membershipRole?: string }
): Promise<void> {
  const hash = hashRefreshToken(refreshPlain)
  const row = await prisma.session.findFirst({
    where: { userId, sessionToken: hash, expiresAt: { gt: new Date() } },
    select: { id: true },
  })
  if (!row) return
  const oldJti = accessJtiFromJwtString(previousAccessToken)
  if (oldJti) await blacklistJti(oldJti, accessTokenTtlSeconds(previousAccessToken))
  const newJti = accessJtiFromJwtString(newAccessToken)
  await prisma.session.update({
    where: { id: row.id },
    data: {
      accessJti: newJti,
      companyId: ctx.companyId ?? null,
      membershipRole: ctx.membershipRole ?? null,
    },
  })
}

export async function refreshAccessTokenFromCookie(
  refreshPlain: string,
  meta: { ipAddress?: string | null; userAgent?: string | null }
): Promise<{ accessToken: string; refreshPlain: string }> {
  const hash = hashRefreshToken(refreshPlain)
  const session = await prisma.session.findFirst({
    where: { sessionToken: hash, expiresAt: { gt: new Date() } },
    select: {
      id: true,
      userId: true,
      accessJti: true,
      companyId: true,
      membershipRole: true,
    },
  })
  if (!session) throw new UnauthorizedError('Sesión inválida o expirada')

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      isSuperuser: true,
    },
  })
  if (!user?.isActive) throw new UnauthorizedError('Usuario no encontrado o inactivo')

  const payload: TokenPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
    isSuperuser: user.isSuperuser ?? false,
  }
  if (session.companyId) payload.companyId = session.companyId
  if (session.membershipRole) payload.membershipRole = session.membershipRole

  const accessToken = generateToken(payload)
  const newRefreshPlain = generateRefreshTokenPlain()
  const newHash = hashRefreshToken(newRefreshPlain)
  const newJti = accessJtiFromJwtString(accessToken)
  const accessMaxSec = jwtExpiresInToMaxAgeSeconds(getConfig().JWT_ACCESS_EXPIRES_IN)
  if (session.accessJti) await blacklistJti(session.accessJti, accessMaxSec)

  await prisma.session.update({
    where: { id: session.id },
    data: {
      sessionToken: newHash,
      accessJti: newJti,
      lastSeenAt: new Date(),
      expiresAt: refreshSessionExpiresAt(),
      ipAddress: meta.ipAddress ?? undefined,
      userAgent: meta.userAgent ?? undefined,
    },
  })

  return { accessToken, refreshPlain: newRefreshPlain }
}

export async function logoutWebSession(accessToken: string | null, refreshPlain: string | null): Promise<void> {
  if (accessToken) {
    const jti = accessJtiFromJwtString(accessToken)
    if (jti) await blacklistJti(jti, accessTokenTtlSeconds(accessToken))
  }
  if (refreshPlain) {
    const hash = hashRefreshToken(refreshPlain)
    await prisma.session.deleteMany({ where: { sessionToken: hash } })
  }
}

export async function createSession(body: {
  userId: string
  sessionToken: string
  ipAddress?: string
  userAgent?: string
  expiresAt?: string
}): Promise<void> {
  const { userId, sessionToken, ipAddress, userAgent, expiresAt } = body
  if (!userId || !sessionToken) throw new BadRequestError('userId y sessionToken son requeridos')
  const verified = verifyToken(sessionToken)
  if (!verified) throw new BadRequestError('sessionToken debe ser un JWT de acceso válido')
  const user = await prisma.user.findUnique({
    where: { id: userId, isActive: true },
    select: { id: true, role: true },
  })
  if (!user) throw new NotFoundError('Usuario no encontrado')
  if (!allowsConcurrentSessions(user.role)) {
    await revokeAllUserSessions(userId)
  }
  const expiresAtVal = expiresAt ? new Date(expiresAt) : refreshSessionExpiresAt()
  const accessJti = accessJtiFromJwtString(sessionToken)
  await prisma.session.create({
    data: {
      userId,
      sessionToken,
      accessJti,
      lastSeenAt: new Date(),
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      expiresAt: expiresAtVal,
      companyId: verified.companyId ?? null,
      membershipRole: verified.membershipRole ?? null,
    },
  })
}

export async function validateSession(token: string): Promise<{ valid: boolean }> {
  if (!token) return { valid: false }
  const rows = await prisma.session.findMany({
    where: { sessionToken: token, expiresAt: { gt: new Date() } },
    take: 1,
    select: { id: true },
  })
  return { valid: rows.length > 0 }
}

export type SessionListItem = {
  id: string
  userId: string
  ipAddress: string | null
  userAgent: string | null
  deviceSummary: string | null
  lastSeenAt: Date | null
  expiresAt: Date
  createdAt: Date
  isCurrent: boolean
}

export async function listSessions(userId: string, currentSessionKey: string | null): Promise<SessionListItem[]> {
  const rows = await prisma.session.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      userId: true,
      sessionToken: true,
      ipAddress: true,
      userAgent: true,
      lastSeenAt: true,
      expiresAt: true,
      createdAt: true,
    },
  })
  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    ipAddress: r.ipAddress,
    userAgent: r.userAgent,
    deviceSummary: summarizeUserAgent(r.userAgent),
    lastSeenAt: r.lastSeenAt,
    expiresAt: r.expiresAt,
    createdAt: r.createdAt,
    isCurrent: currentSessionKey != null && r.sessionToken === currentSessionKey,
  }))
}

export async function deleteSession(
  token: string,
  callerId: string,
  isSuperuser: boolean
): Promise<void> {
  const decodedToken = decodeURIComponent(token)
  const existing = await prisma.session.findMany({
    where: { sessionToken: decodedToken },
    take: 1,
    select: { id: true, userId: true, accessJti: true },
  })
  if (existing.length === 0) throw new NotFoundError('Session not found')
  const sessionUserId = existing[0].userId
  assertSelfOrSuperuser(callerId, sessionUserId, isSuperuser, 'No puedes eliminar sesiones de otro usuario')
  const accessMaxSec = jwtExpiresInToMaxAgeSeconds(getConfig().JWT_ACCESS_EXPIRES_IN)
  if (existing[0].accessJti) await blacklistJti(existing[0].accessJti, accessMaxSec)
  await prisma.session.deleteMany({ where: { sessionToken: decodedToken } })
}

export async function deleteSessionById(
  sessionId: string,
  callerId: string,
  isSuperuser: boolean,
  currentSessionKey: string | null
): Promise<void> {
  const row = await prisma.session.findFirst({
    where: { id: sessionId, expiresAt: { gt: new Date() } },
    select: { id: true, userId: true, accessJti: true, sessionToken: true },
  })
  if (!row) throw new NotFoundError('Session not found')
  assertSelfOrSuperuser(callerId, row.userId, isSuperuser, 'No puedes eliminar sesiones de otro usuario')
  if (currentSessionKey != null && row.sessionToken === currentSessionKey) {
    throw new BadRequestError('Usa «Cerrar sesión» para terminar la sesión actual')
  }
  const accessMaxSec = jwtExpiresInToMaxAgeSeconds(getConfig().JWT_ACCESS_EXPIRES_IN)
  if (row.accessJti) await blacklistJti(row.accessJti, accessMaxSec)
  await prisma.session.delete({ where: { id: row.id } })
}

export async function terminateOthersSessions(
  userId: string,
  currentSessionToken: string,
  callerId: string,
  isSuperuser: boolean
): Promise<void> {
  if (!userId || !currentSessionToken) throw new BadRequestError('userId y currentSessionToken son requeridos')
  assertSelfOrSuperuser(callerId, userId, isSuperuser, 'Solo puedes terminar tus propias sesiones')
  const others = await prisma.session.findMany({
    where: { userId, sessionToken: { not: currentSessionToken } },
    select: { accessJti: true },
  })
  const accessMaxSec = jwtExpiresInToMaxAgeSeconds(getConfig().JWT_ACCESS_EXPIRES_IN)
  await blacklistJtis(
    others.map((o) => o.accessJti),
    accessMaxSec,
  )
  await prisma.session.deleteMany({
    where: { userId, sessionToken: { not: currentSessionToken } },
  })
}

export async function cleanupExpiredSessions(isSuperuser: boolean): Promise<{ count: number }> {
  if (!isSuperuser) throw new ForbiddenError('Solo superusuarios pueden ejecutar esta operación')
  const deleted = await prisma.session.deleteMany({
    where: { expiresAt: { lte: new Date() } },
  })
  return { count: deleted.count }
}

export async function updateConcurrentSessions(
  userId: string,
  callerId: string,
  isSuperuser: boolean
): Promise<void> {
  assertSelfOrSuperuser(callerId, userId, isSuperuser, 'Solo puedes modificar la política de sesiones de tu propio usuario')
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  })
  if (!user) throw new NotFoundError('Usuario no encontrado')
}

export async function changePassword(userId: string, body: ChangePasswordBody): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, password: true, email: true },
  })
  if (!user) throw new NotFoundError('Usuario no encontrado')

  if (user.password == null) {
    throw new BadRequestError(
      'Esta cuenta no tiene contraseña. Usá el inicio de sesión con Google.',
      'PASSWORD_NOT_SET',
    )
  }

  const currentOk = await bcrypt.compare(body.currentPassword, user.password)
  if (!currentOk) throw new UnauthorizedError('Contraseña actual incorrecta')

  if (body.currentPassword === body.newPassword) {
    throw new BadRequestError('La contraseña nueva debe ser distinta a la actual')
  }

  const hashedPassword = await bcrypt.hash(body.newPassword, 10)
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  })

  const companyId = await resolveAuditCompanyId(userId)
  writeAuditLog({
    companyId,
    userId,
    action: 'PASSWORD_CHANGED',
    entityType: 'user',
    entityId: userId,
  })
}
