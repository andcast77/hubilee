import type { FastifyRequest, FastifyReply } from 'fastify'
import type { FastifyInstance } from 'fastify'
import { requireAuth, getAuthToken } from '../../core/auth.js'
import { validateBody, validateQuery } from '../../core/validate.js'
import {
  loginBodySchema,
  floorLoginBodySchema,
  registerBodySchema,
  verifyTokenSchema,
  setContextSchema,
  createSessionSchema,
  terminateOthersSessionsSchema,
  validateSessionQuerySchema,
  listSessionsQuerySchema,
  mfaVerifyTotpSchema,
  mfaVerifyBackupSchema,
  registerOtpSendBodySchema,
  registerOtpVerifyBodySchema,
  registerLinkSendBodySchema,
  registerLinkVerifyBodySchema,
  verifyEmailQuerySchema,
  resendVerificationBodySchema,
  changePasswordBodySchema,
  refreshBodySchema,
  googleOAuthStartQuerySchema,
  googleOAuthCallbackQuerySchema,
} from '../../dto/auth.dto.js'
import { ok } from '../../common/api-response.js'
import * as authService from '../../services/auth.service.js'
import * as googleOAuthService from '../../services/google-oauth.service.js'
import * as registrationOtpService from '../../services/registration-otp.service.js'
import * as registrationLinkService from '../../services/registration-link.service.js'
import * as emailVerificationService from '../../services/email-verification.service.js'
import {
  attachAuthSessionCookie,
  clearAllAuthCookies,
  attachRefreshSessionCookie,
  getRefreshTokenFromCookieHeader,
} from '../../core/session-cookie.js'
import { hashRefreshToken } from '../../core/refresh-token.js'
import { getConfig } from '../../core/config.js'
import { apiOkEnvelope200 } from '../../common/fastify-response-schemas.js'
import { assertSelfOrSuperuser } from '../../policies/company-authorization.policy.js'
import { writeAuditLog } from '../../services/audit-log.service.js'
import { verifyMfaPendingToken, verifyToken } from '../../core/auth.js'
import { UnauthorizedError, BadRequestError } from '../../common/errors/app-error.js'
import { randomBytes } from 'node:crypto'
import {
  buildGoogleOAuthPopupBridgeHtml,
  type GoogleOAuthBridgeMessage,
} from '../../lib/google-oauth-popup-bridge.js'

async function attachWebAuthCookies(
  reply: FastifyReply,
  accessToken: string,
  userId: string,
  ctx: { companyId?: string; membershipRole?: string },
  meta: { ip: string; ua: string | null }
): Promise<{ refreshPlain: string }> {
  const config = getConfig()
  const { refreshPlain } = await authService.createWebSessionPair(userId, accessToken, ctx, {
    ipAddress: meta.ip,
    userAgent: meta.ua,
  })
  attachAuthSessionCookie(reply, accessToken, config)
  attachRefreshSessionCookie(reply, refreshPlain, config)
  return { refreshPlain }
}

/**
 * Gating signal for the desktop (Tauri) client — ADDITIVE, web-desktop-vite-tauri PR1.
 * Web never sends this header, so its handler path is unaffected. Only an exact
 * `x-client: desktop` header unlocks `data.tokens` in the response body.
 */
export function isDesktopClient(request: FastifyRequest): boolean {
  return request.headers['x-client'] === 'desktop'
}

export async function login(request: FastifyRequest, reply: FastifyReply) {
  const body = validateBody(loginBodySchema, request.body)
  const ip = request.ip
  const ua = (request.headers['user-agent'] as string | undefined) ?? null

  const result = await authService.login(body)

  if ('mfaRequired' in result && result.mfaRequired) {
    return ok({
      mfaRequired: true,
      tempToken: result.tempToken,
      user: result.user,
      companyId: result.companyId,
      company: result.company,
      companies: result.companies,
      companyProfileComplete: result.companyProfileComplete,
    })
  }

  if (result.companyId) {
    writeAuditLog({
      companyId: result.companyId,
      userId: result.user.id,
      action: 'LOGIN_SUCCESS',
      entityType: 'auth',
      entityId: result.user.id,
      ipAddress: ip,
      userAgent: ua,
    })
  }

  const { token, ...data } = result
  const { refreshPlain } = await attachWebAuthCookies(reply, token, result.user.id, {
    companyId: result.companyId,
    membershipRole: result.membershipRole,
  }, { ip, ua })
  if (isDesktopClient(request)) {
    ;(data as Record<string, unknown>).tokens = { accessToken: token, refreshToken: refreshPlain }
  }
  return ok(data)
}

/**
 * @deprecated Prefer POST /v1/auth/login with `{ userCode, password }`.
 * Thin alias kept for older clients — maps to authService.floorLogin → login({ userCode }).
 */
export async function floorLogin(request: FastifyRequest, reply: FastifyReply) {
  const body = validateBody(floorLoginBodySchema, request.body)
  const ip = request.ip
  const ua = (request.headers['user-agent'] as string | undefined) ?? null

  const result = await authService.floorLogin(body)

  if ('mfaRequired' in result && result.mfaRequired) {
    return ok({
      mfaRequired: true,
      tempToken: result.tempToken,
      user: result.user,
      companyId: result.companyId,
      company: result.company,
      companies: result.companies,
      companyProfileComplete: result.companyProfileComplete,
    })
  }

  if (result.companyId) {
    writeAuditLog({
      companyId: result.companyId,
      userId: result.user.id,
      action: 'LOGIN_SUCCESS',
      entityType: 'auth',
      entityId: result.user.id,
      ipAddress: ip,
      userAgent: ua,
      after: { method: 'floor-login' },
    })
  }

  const { token, ...data } = result
  const { refreshPlain } = await attachWebAuthCookies(reply, token, result.user.id, {
    companyId: result.companyId,
    membershipRole: result.membershipRole,
  }, { ip, ua })
  if (isDesktopClient(request)) {
    ;(data as Record<string, unknown>).tokens = { accessToken: token, refreshToken: refreshPlain }
  }
  return ok(data)
}

function auditMfaFailure(companyId: string | undefined, userId: string | undefined, ip: string, ua: string | null) {
  if (!userId) return
  writeAuditLog({
    companyId: companyId ?? null,
    userId,
    action: 'MFA_FAILED',
    entityType: 'auth',
    entityId: userId,
    ipAddress: ip,
    userAgent: ua,
  })
}

export async function verifyMfaTotp(request: FastifyRequest, reply: FastifyReply) {
  const body = validateBody(mfaVerifyTotpSchema, request.body)
  const ip = request.ip
  const ua = (request.headers['user-agent'] as string | undefined) ?? null
  const pending = verifyMfaPendingToken(body.tempToken)

  try {
    const { login } = await authService.completeMfaLogin({
      tempToken: body.tempToken,
      companyId: body.companyId,
      totpCode: body.totpCode,
    })
    if (login.companyId) {
      writeAuditLog({
        companyId: login.companyId,
        userId: login.user.id,
        action: 'MFA_VERIFIED',
        entityType: 'auth',
        entityId: login.user.id,
        ipAddress: ip,
        userAgent: ua,
      })
      writeAuditLog({
        companyId: login.companyId,
        userId: login.user.id,
        action: 'LOGIN_SUCCESS',
        entityType: 'auth',
        entityId: login.user.id,
        ipAddress: ip,
        userAgent: ua,
      })
    }
    const { token, ...data } = login
    const { refreshPlain } = await attachWebAuthCookies(reply, token, login.user.id, {
      companyId: login.companyId,
      membershipRole: login.membershipRole,
    }, { ip, ua })
    if (isDesktopClient(request)) {
      ;(data as Record<string, unknown>).tokens = { accessToken: token, refreshToken: refreshPlain }
    }
    return ok(data)
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      auditMfaFailure(body.companyId, pending?.userId, ip, ua)
    }
    throw err
  }
}

export async function verifyMfaBackup(request: FastifyRequest, reply: FastifyReply) {
  const body = validateBody(mfaVerifyBackupSchema, request.body)
  const ip = request.ip
  const ua = (request.headers['user-agent'] as string | undefined) ?? null
  const pending = verifyMfaPendingToken(body.tempToken)

  try {
    const { login } = await authService.completeMfaLogin({
      tempToken: body.tempToken,
      companyId: body.companyId,
      backupCode: body.backupCode,
    })
    if (login.companyId) {
      writeAuditLog({
        companyId: login.companyId,
        userId: login.user.id,
        action: 'MFA_BACKUP_USED',
        entityType: 'auth',
        entityId: login.user.id,
        ipAddress: ip,
        userAgent: ua,
      })
      writeAuditLog({
        companyId: login.companyId,
        userId: login.user.id,
        action: 'LOGIN_SUCCESS',
        entityType: 'auth',
        entityId: login.user.id,
        ipAddress: ip,
        userAgent: ua,
      })
    }
    const { token, ...data } = login
    const { refreshPlain } = await attachWebAuthCookies(reply, token, login.user.id, {
      companyId: login.companyId,
      membershipRole: login.membershipRole,
    }, { ip, ua })
    if (isDesktopClient(request)) {
      ;(data as Record<string, unknown>).tokens = { accessToken: token, refreshToken: refreshPlain }
    }
    return ok(data)
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      auditMfaFailure(body.companyId, pending?.userId, ip, ua)
    }
    throw err
  }
}

export async function register(request: FastifyRequest, reply: FastifyReply) {
  const body = validateBody(registerBodySchema, request.body)
  const ip = request.ip
  const ua = (request.headers['user-agent'] as string | undefined) ?? null
  const result = await authService.register(body)
  const { token, ...data } = result
  const { refreshPlain } = await attachWebAuthCookies(reply, token, result.user.id, {
    companyId: result.user.companyId,
    membershipRole: result.user.companyId ? 'OWNER' : undefined,
  }, { ip, ua })
  if (isDesktopClient(request)) {
    ;(data as Record<string, unknown>).tokens = { accessToken: token, refreshToken: refreshPlain }
  }
  return ok(data)
}

export async function me(request: FastifyRequest, reply: FastifyReply) {
  const result = await authService.me(request.user!)
  return ok(result)
}

export async function changePassword(request: FastifyRequest, reply: FastifyReply) {
  const body = validateBody(changePasswordBodySchema, request.body)
  await authService.changePassword(request.user!.id, body)
  return ok({ message: 'Contraseña actualizada.' })
}

export async function logout(request: FastifyRequest, reply: FastifyReply) {
  const access = getAuthToken(request)
  const refreshPlain = getRefreshTokenFromCookieHeader(request.headers.cookie)
  await authService.logoutWebSession(access, refreshPlain)
  clearAllAuthCookies(reply, getConfig())
  const decoded = access ? verifyToken(access) : null
  if (decoded) {
    writeAuditLog({
      companyId: decoded.companyId ?? null,
      userId: decoded.id,
      action: 'LOGOUT',
      entityType: 'auth',
      entityId: decoded.id,
      ipAddress: request.ip,
      userAgent: (request.headers['user-agent'] as string | undefined) ?? null,
    })
  }
  return { success: true }
}

export async function verify(request: FastifyRequest, reply: FastifyReply) {
  const { token } = validateBody(verifyTokenSchema, request.body)
  const result = await authService.verify(token)
  return ok(result)
}

export async function registerOtpSend(request: FastifyRequest, reply: FastifyReply) {
  const body = validateBody(registerOtpSendBodySchema, request.body)
  await registrationOtpService.sendRegistrationOtp({
    email: body.email,
    captchaToken: body.captchaToken,
    remoteip: request.ip,
  })
  return ok({ sent: true })
}

export async function registerOtpVerify(request: FastifyRequest, reply: FastifyReply) {
  const body = validateBody(registerOtpVerifyBodySchema, request.body)
  const { registrationTicket } = await registrationOtpService.verifyRegistrationOtp(body)
  return ok({ registrationTicket })
}

export async function registerLinkSend(request: FastifyRequest, reply: FastifyReply) {
  const body = validateBody(registerLinkSendBodySchema, request.body)
  await registrationLinkService.sendRegistrationLink({
    email: body.email,
    captchaToken: body.captchaToken,
    remoteip: request.ip,
    verificationBaseUrl: body.verificationBaseUrl,
    draft: {
      password: body.password,
      firstName: body.firstName ?? '',
      lastName: body.lastName ?? '',
      // POS register omits companyName; link service fills a placeholder until wizard.
      companyName: body.companyName ?? '',
      hrEnabled: body.hrEnabled,
      posEnabled: body.posEnabled,
      technicalServicesEnabled: body.technicalServicesEnabled,
    },
  })
  return ok({ sent: true })
}

export async function registerLinkVerify(request: FastifyRequest, reply: FastifyReply) {
  const body = validateBody(registerLinkVerifyBodySchema, request.body)
  const ip = request.ip
  const ua = (request.headers['user-agent'] as string | undefined) ?? null
  const result = await registrationLinkService.completeRegistrationFromLink(body)
  const { token, ...data } = result
  const { refreshPlain } = await attachWebAuthCookies(reply, token, result.user.id, {
    companyId: result.user.companyId,
    membershipRole: result.user.companyId ? 'OWNER' : undefined,
  }, { ip, ua })
  if (isDesktopClient(request)) {
    ;(data as Record<string, unknown>).tokens = { accessToken: token, refreshToken: refreshPlain }
  }
  return ok(data)
}

export async function verifyEmailGet(request: FastifyRequest, reply: FastifyReply) {
  const q = validateQuery(verifyEmailQuerySchema, request.query)
  const result = await emailVerificationService.verifyEmailWithToken(q.token)
  return ok(result)
}

export async function resendVerificationPost(request: FastifyRequest, reply: FastifyReply) {
  const body = validateBody(resendVerificationBodySchema, request.body)
  const result = await emailVerificationService.resendVerificationEmail(body.email)
  return ok(result)
}

export async function listCompanies(request: FastifyRequest, reply: FastifyReply) {
  const decoded = request.user!
  const companies = await authService.getCompanies(decoded.id, decoded.isSuperuser ?? false)
  return ok(companies)
}

export async function setContext(request: FastifyRequest, reply: FastifyReply) {
  const { companyId } = validateBody(setContextSchema, request.body)
  const decoded = request.user!
  const oldAccess = getAuthToken(request)
  const refreshPlain = getRefreshTokenFromCookieHeader(request.headers.cookie)
  const result = await authService.setContext(decoded, companyId)
  const { token, ...data } = result
  const config = getConfig()
  if (refreshPlain && oldAccess) {
    await authService.rotateAccessForCurrentRefreshSession(decoded.id, refreshPlain, oldAccess, token, {
      companyId,
      membershipRole: result.membershipRole ?? undefined,
    })
  }
  attachAuthSessionCookie(reply, token, config)
  return ok(data)
}

export async function createSession(request: FastifyRequest, reply: FastifyReply) {
  const body = validateBody(createSessionSchema, request.body)
  const decoded = request.user!
  assertSelfOrSuperuser(decoded.id, body.userId, decoded.isSuperuser, 'Solo puedes crear sesión para tu propio usuario')
  await authService.createSession(body)
  return { success: true }
}

export async function validateSession(request: FastifyRequest, reply: FastifyReply) {
  const { token } = validateQuery(validateSessionQuerySchema, request.query)
  const result = await authService.validateSession(token)
  return ok(result)
}

export async function listSessions(request: FastifyRequest, reply: FastifyReply) {
  const q = validateQuery(listSessionsQuerySchema, request.query)
  const decoded = request.user!
  const userId = q.userId ?? decoded.id
  assertSelfOrSuperuser(decoded.id, userId, decoded.isSuperuser, 'Solo puedes listar tus propias sesiones')
  const refreshPlain = getRefreshTokenFromCookieHeader(request.headers.cookie)
  const access = getAuthToken(request)
  const currentKey =
    refreshPlain != null
      ? hashRefreshToken(refreshPlain)
      : access
        ? access
        : null
  const rows = await authService.listSessions(userId, currentKey)
  return ok(rows)
}

export async function refreshTokens(request: FastifyRequest, reply: FastifyReply) {
  const desktop = isDesktopClient(request)
  // Cookie takes precedence — web clients are unaffected. Desktop clients have no
  // cookie store, so they send the refresh token in the body instead (ADR-A1).
  const cookieRefresh = getRefreshTokenFromCookieHeader(request.headers.cookie)
  const refreshPlain =
    cookieRefresh ?? (desktop ? validateBody(refreshBodySchema, request.body ?? {}).refreshToken : undefined)
  if (!refreshPlain) throw new UnauthorizedError('Sesión no encontrada')
  const config = getConfig()
  const { accessToken, refreshPlain: newRefresh } = await authService.refreshAccessTokenFromCookie(refreshPlain, {
    ipAddress: request.ip,
    userAgent: (request.headers['user-agent'] as string | undefined) ?? null,
  })
  attachAuthSessionCookie(reply, accessToken, config)
  attachRefreshSessionCookie(reply, newRefresh, config)
  if (desktop) {
    return ok({ tokens: { accessToken, refreshToken: newRefresh } })
  }
  return ok({ refreshed: true })
}

export async function deleteSessionByIdHandler(
  request: FastifyRequest<{ Params: { sessionId: string } }>,
  reply: FastifyReply
) {
  const caller = request.user!
  const refreshPlain = getRefreshTokenFromCookieHeader(request.headers.cookie)
  const access = getAuthToken(request)
  const currentKey =
    refreshPlain != null ? hashRefreshToken(refreshPlain) : access ? access : null
  await authService.deleteSessionById(
    request.params.sessionId,
    caller.id,
    caller.isSuperuser ?? false,
    currentKey
  )
  return { success: true }
}

export async function deleteOtherSessions(request: FastifyRequest, reply: FastifyReply) {
  const decoded = request.user!
  const refreshPlain = getRefreshTokenFromCookieHeader(request.headers.cookie)
  const currentKey = refreshPlain != null ? hashRefreshToken(refreshPlain) : null
  if (!currentKey) {
    throw new BadRequestError('Se requiere la cookie de sesión para cerrar las demás sesiones')
  }
  await authService.terminateOthersSessions(
    decoded.id,
    currentKey,
    decoded.id,
    decoded.isSuperuser ?? false
  )
  return { success: true }
}

export async function deleteSession(
  request: FastifyRequest<{ Params: { token: string } }>,
  reply: FastifyReply
) {
  const caller = request.user!
  await authService.deleteSession(request.params.token, caller.id, caller.isSuperuser ?? false)
  return { success: true }
}

export async function terminateOthersSessions(request: FastifyRequest, reply: FastifyReply) {
  const { userId, currentSessionToken: bodyCurrent } = validateBody(terminateOthersSessionsSchema, request.body)
  const caller = request.user!
  const refreshPlain = getRefreshTokenFromCookieHeader(request.headers.cookie)
  const currentKey =
    bodyCurrent ??
    (refreshPlain != null ? hashRefreshToken(refreshPlain) : null)
  if (!currentKey) {
    throw new BadRequestError('Se requiere la sesión actual (cookie o currentSessionToken)')
  }
  await authService.terminateOthersSessions(userId, currentKey, caller.id, caller.isSuperuser ?? false)
  return { success: true }
}

export async function cleanupExpiredSessions(request: FastifyRequest, reply: FastifyReply) {
  const result = await authService.cleanupExpiredSessions(request.user?.isSuperuser ?? false)
  return ok(result)
}

export async function updateConcurrentSessions(
  request: FastifyRequest<{ Params: { userId: string }; Body: { allowConcurrentSessions?: boolean } }>,
  reply: FastifyReply
) {
  const caller = request.user!
  await authService.updateConcurrentSessions(request.params.userId, caller.id, caller.isSuperuser ?? false)
  return { success: true }
}

const authSuccessResponseSchema = {
  response: {
    200: apiOkEnvelope200,
  },
} as const

/** OTP pre-registro empresa — bucket dedicado (see rate-limit.plugin). */
export async function registerRegisterOtpRoutes(fastify: FastifyInstance) {
  fastify.post('/v1/auth/register/otp/send', { schema: authSuccessResponseSchema }, (request, reply) =>
    registerOtpSend(request, reply)
  )
  fastify.post('/v1/auth/register/otp/verify', { schema: authSuccessResponseSchema }, (request, reply) =>
    registerOtpVerify(request, reply)
  )
}

/** PLAN-40 — magic link pre-registro; mismo bucket de rate-limit que OTP (plugin). */
export async function registerRegisterLinkRoutes(fastify: FastifyInstance) {
  fastify.post('/v1/auth/register/link/send', { schema: authSuccessResponseSchema }, (request, reply) =>
    registerLinkSend(request, reply)
  )
  fastify.post('/v1/auth/register/link/verify', { schema: authSuccessResponseSchema }, (request, reply) =>
    registerLinkVerify(request, reply)
  )
}

/** MFA verify routes — registered under stricter rate limit (see rate-limit.plugin). */
export async function registerMfaAuthRoutes(fastify: FastifyInstance) {
  fastify.post('/v1/auth/mfa/verify', { schema: authSuccessResponseSchema }, (request, reply) =>
    verifyMfaTotp(request, reply)
  )
  fastify.post('/v1/auth/mfa/verify-backup', { schema: authSuccessResponseSchema }, (request, reply) =>
    verifyMfaBackup(request, reply)
  )
}

/** Build Pos redirect after Google callback (exported for unit tests). */
export function buildGoogleOAuthAppRedirect(params: {
  returnOrigin: string
  kind: 'session' | 'mfa' | 'error'
  next?: string | null
  tempToken?: string
  errorCode?: string
}): string {
  const origin = params.returnOrigin.replace(/\/$/, '')
  if (params.kind === 'mfa' && params.tempToken) {
    const url = new URL('/login', `${origin}/`)
    url.searchParams.set('mfa', '1')
    url.searchParams.set('tempToken', params.tempToken)
    return url.toString()
  }
  if (params.kind === 'error') {
    const url = new URL('/login', `${origin}/`)
    url.searchParams.set('oauth_error', params.errorCode ?? 'OAUTH_ERROR')
    return url.toString()
  }
  const next = googleOAuthService.safeOAuthNextPath(params.next ?? null) ?? '/dashboard'
  return `${origin}${next}`
}

function buildGoogleOAuthBridgePayload(params: {
  kind: 'session' | 'mfa' | 'error'
  next?: string | null
  tempToken?: string
  errorCode?: string
}): GoogleOAuthBridgeMessage {
  if (params.kind === 'mfa' && params.tempToken) {
    return {
      type: 'hubilee:google-oauth',
      v: 1,
      status: 'mfa',
      tempToken: params.tempToken,
    }
  }
  if (params.kind === 'error') {
    return {
      type: 'hubilee:google-oauth',
      v: 1,
      status: 'error',
      error: params.errorCode ?? 'OAUTH_ERROR',
    }
  }
  const next = googleOAuthService.safeOAuthNextPath(params.next ?? null) ?? undefined
  const payload: GoogleOAuthBridgeMessage = {
    type: 'hubilee:google-oauth',
    v: 1,
    status: 'session',
  }
  if (next) payload.next = next
  return payload
}

/** Popup display: HTML bridge + per-reply nonce CSP (no Pos 302). */
function replyGoogleOAuthPopupBridge(
  reply: FastifyReply,
  params: {
    returnOrigin: string
    kind: 'session' | 'mfa' | 'error'
    next?: string | null
    tempToken?: string
    errorCode?: string
  },
) {
  const nonce = randomBytes(16).toString('base64')
  const html = buildGoogleOAuthPopupBridgeHtml({
    nonce,
    targetOrigin: params.returnOrigin,
    payload: buildGoogleOAuthBridgePayload(params),
  })
  return reply
    .header('Content-Security-Policy', `default-src 'self'; script-src 'nonce-${nonce}'`)
    .type('text/html; charset=utf-8')
    .send(html)
}

export async function googleStart(request: FastifyRequest, reply: FastifyReply) {
  const q = validateQuery(googleOAuthStartQuerySchema, request.query)
  const { authorizeUrl } = await googleOAuthService.startGoogleOAuth({
    returnOrigin: q.returnOrigin,
    intent: q.intent,
    next: q.next,
    display: q.display,
  })
  return reply.redirect(authorizeUrl)
}

export async function googleCallback(request: FastifyRequest, reply: FastifyReply) {
  const q = validateQuery(googleOAuthCallbackQuerySchema, request.query)
  if (q.error) {
    // Google denied — consume state when present so opener gets structured error.
    if (q.state?.trim()) {
      try {
        const statePayload = await googleOAuthService.consumeGoogleOAuthState(q.state.trim())
        if (statePayload.display === 'popup') {
          return replyGoogleOAuthPopupBridge(reply, {
            returnOrigin: statePayload.returnOrigin,
            kind: 'error',
            errorCode: 'GOOGLE_OAUTH_DENIED',
          })
        }
        return reply.redirect(
          buildGoogleOAuthAppRedirect({
            returnOrigin: statePayload.returnOrigin,
            kind: 'error',
            errorCode: 'GOOGLE_OAUTH_DENIED',
          }),
        )
      } catch {
        // Unusable state — fail closed below.
      }
    }
    throw new BadRequestError('Google OAuth cancelado', 'GOOGLE_OAUTH_DENIED')
  }

  const ip = request.ip
  const ua = (request.headers['user-agent'] as string | undefined) ?? null
  const outcome = await googleOAuthService.completeGoogleOAuthCallback({
    code: q.code,
    state: q.state,
  })

  if (outcome.kind === 'error') {
    if (!outcome.returnOrigin) {
      throw new BadRequestError('OAuth falló', outcome.code)
    }
    if (outcome.display === 'popup') {
      return replyGoogleOAuthPopupBridge(reply, {
        returnOrigin: outcome.returnOrigin,
        kind: 'error',
        errorCode: outcome.code,
      })
    }
    return reply.redirect(
      buildGoogleOAuthAppRedirect({
        returnOrigin: outcome.returnOrigin,
        kind: 'error',
        errorCode: outcome.code,
      }),
    )
  }

  if (outcome.kind === 'mfa') {
    if (outcome.display === 'popup') {
      return replyGoogleOAuthPopupBridge(reply, {
        returnOrigin: outcome.returnOrigin,
        kind: 'mfa',
        tempToken: outcome.tempToken,
      })
    }
    return reply.redirect(
      buildGoogleOAuthAppRedirect({
        returnOrigin: outcome.returnOrigin,
        kind: 'mfa',
        tempToken: outcome.tempToken,
      }),
    )
  }

  const { login, returnOrigin, next, display } = outcome
  if (login.companyId) {
    writeAuditLog({
      companyId: login.companyId,
      userId: login.user.id,
      action: 'LOGIN_SUCCESS',
      entityType: 'auth',
      entityId: login.user.id,
      ipAddress: ip,
      userAgent: ua,
    })
  }
  await attachWebAuthCookies(
    reply,
    login.token,
    login.user.id,
    {
      companyId: login.companyId,
      membershipRole: login.membershipRole,
    },
    { ip, ua },
  )
  if (display === 'popup') {
    return replyGoogleOAuthPopupBridge(reply, {
      returnOrigin,
      kind: 'session',
      next,
    })
  }
  return reply.redirect(
    buildGoogleOAuthAppRedirect({
      returnOrigin,
      kind: 'session',
      next,
    }),
  )
}

/** Google OAuth start + callback — dedicated rate-limit bucket. */
export async function registerGoogleAuthRoutes(fastify: FastifyInstance) {
  fastify.get('/v1/auth/google', (request, reply) => googleStart(request, reply))
  fastify.get('/v1/auth/google/callback', (request, reply) => googleCallback(request, reply))
}

/** Login, register, verify — own rate-limit bucket (see server.ts). */
export async function registerPublicAuthRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: { email: string; password: string; companyId?: string } }>(
    '/v1/auth/login',
    { schema: authSuccessResponseSchema },
    (request, reply) => login(request, reply)
  )
  fastify.post(
    '/v1/auth/floor-login' /* @deprecated prefer POST /v1/auth/login with userCode */,
    { schema: authSuccessResponseSchema },
    (request, reply) => floorLogin(request, reply),
  )
  fastify.post('/v1/auth/register', { schema: authSuccessResponseSchema }, (request, reply) =>
    register(request, reply)
  )
  fastify.post<{ Body: { token: string } }>(
    '/v1/auth/verify',
    { schema: authSuccessResponseSchema },
    (request, reply) => verify(request, reply)
  )
  fastify.post('/v1/auth/refresh', { schema: authSuccessResponseSchema }, (request, reply) =>
    refreshTokens(request, reply)
  )
  fastify.get('/v1/auth/verify-email', { schema: authSuccessResponseSchema }, (request, reply) =>
    verifyEmailGet(request, reply)
  )
  fastify.post('/v1/auth/resend-verification', { schema: authSuccessResponseSchema }, (request, reply) =>
    resendVerificationPost(request, reply)
  )
}

export async function registerProtectedAuthRoutes(fastify: FastifyInstance) {
  fastify.post('/v1/auth/logout', (request, reply) => logout(request, reply))
  fastify.post('/v1/auth/password', { preHandler: [requireAuth] }, (request, reply) =>
    changePassword(request, reply)
  )
  fastify.get('/v1/auth/me', { preHandler: [requireAuth] }, (request, reply) => me(request, reply))
  fastify.get('/v1/auth/companies', { preHandler: [requireAuth] }, (request, reply) => listCompanies(request, reply))
  fastify.post<{ Body: { companyId: string } }>('/v1/auth/context', { preHandler: [requireAuth] }, (request, reply) => setContext(request, reply))
  fastify.post<{
    Body: { userId: string; sessionToken: string; ipAddress?: string; userAgent?: string; expiresAt?: string }
  }>('/v1/auth/sessions', { preHandler: [requireAuth] }, (request, reply) => createSession(request, reply))
  fastify.get<{ Querystring: { token?: string } }>(
    '/v1/auth/sessions/validate', (request, reply) => validateSession(request, reply))
  fastify.get<{ Querystring: { userId?: string } }>(
    '/v1/auth/sessions', { preHandler: [requireAuth] }, (request, reply) => listSessions(request, reply))
  fastify.delete('/v1/auth/sessions', { preHandler: [requireAuth] }, (request, reply) =>
    deleteOtherSessions(request, reply)
  )
  fastify.delete<{ Params: { sessionId: string } }>(
    '/v1/auth/sessions/session/:sessionId',
    { preHandler: [requireAuth] },
    (request, reply) => deleteSessionByIdHandler(request, reply)
  )
  fastify.delete<{ Params: { token: string } }>(
    '/v1/auth/sessions/:token', { preHandler: [requireAuth] }, (request, reply) => deleteSession(request, reply))
  fastify.post<{ Body: { userId: string; currentSessionToken?: string } }>(
    '/v1/auth/sessions/terminate-others', { preHandler: [requireAuth] }, (request, reply) => terminateOthersSessions(request, reply))
  fastify.post(
    '/v1/auth/sessions/cleanup-expired', { preHandler: [requireAuth] }, (request, reply) => cleanupExpiredSessions(request, reply))
  fastify.put<{ Params: { userId: string }; Body: { allowConcurrentSessions?: boolean } }>(
    '/v1/auth/users/:userId/concurrent-sessions', { preHandler: [requireAuth] }, (request, reply) => updateConcurrentSessions(request, reply))
}

export async function registerRoutes(fastify: FastifyInstance) {
  await registerPublicAuthRoutes(fastify)
  await registerProtectedAuthRoutes(fastify)
}
