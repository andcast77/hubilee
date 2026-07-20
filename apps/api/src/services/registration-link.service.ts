import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { prisma } from '../db/index.js'
import { getRedis } from '../common/cache/redis.js'
import { getConfig } from '../core/config.js'
import { parseCorsOriginList } from '../core/cors-reflect.js'
import {
  BadRequestError,
  ServiceUnavailableError,
  TooManyRequestsError,
} from '../common/errors/app-error.js'
import { verifyTurnstileToken } from './turnstile.service.js'
import { sendRegistrationMagicLinkEmail } from './mailer.service.js'
import { issueRegistrationTicket } from './registration-ticket.service.js'
import * as authService from './auth.service.js'
import type { RegisterResult } from './auth.service.js'

type Challenge = { h: string; sc: number; fc: number }

/** Datos de alta guardados en Redis hasta consumir el enlace (cualquier navegador). */
export type RegistrationLinkDraft = {
  password: string
  firstName: string
  lastName: string
  companyName: string
  workifyEnabled?: boolean
  posEnabled?: boolean
  technicalServicesEnabled?: boolean
}

type PendingRegBlob = Challenge & { draft: RegistrationLinkDraft }

/** Upstash puede devolver el valor como string o como objeto ya parseado. */
function parsePendingRegBlob(raw: unknown): PendingRegBlob | null {
  if (raw == null) return null
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as PendingRegBlob
    } catch {
      return null
    }
  }
  if (typeof raw === 'object' && raw !== null && 'h' in raw && 'draft' in raw) {
    return raw as PendingRegBlob
  }
  return null
}

function pendingKey(email: string): string {
  return `reglink:pending:${Buffer.from(email.trim().toLowerCase()).toString('base64url')}`
}

function hashLinkToken(token: string, email: string, pepper: string): string {
  return createHmac('sha256', pepper)
    .update(email.toLowerCase().trim())
    .update('|')
    .update(token.trim())
    .digest('hex')
}

function effectivePepper(config: ReturnType<typeof getConfig>): string {
  const p = config.OTP_PEPPER?.trim()
  if (p && p.length >= 8) return p
  if (config.NODE_ENV === 'production') {
    throw new ServiceUnavailableError(
      'OTP_PEPPER debe tener al menos 8 caracteres en producción',
      'OTP_MISCONFIGURED',
    )
  }
  return config.JWT_SECRET
}

/** Base URL for /register/verify. */
export function resolveVerificationBaseUrl(verificationBaseUrl: string | undefined): string {
  const config = getConfig()
  const hub = config.HUB_PUBLIC_URL.replace(/\/$/, '')
  const raw = verificationBaseUrl?.trim()
  if (!raw) return hub

  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    throw new BadRequestError('URL de verificación inválida', 'INVALID_VERIFICATION_BASE_URL')
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new BadRequestError('URL de verificación inválida', 'INVALID_VERIFICATION_BASE_URL')
  }
  const origin = `${parsed.protocol}//${parsed.host}`.replace(/\/$/, '')
  const allowed = parseCorsOriginList(config.CORS_ORIGIN)
  if (!allowed.includes(origin)) {
    throw new BadRequestError('Origen de verificación no permitido', 'VERIFICATION_ORIGIN_NOT_ALLOWED')
  }
  return origin
}

export async function sendRegistrationLink(params: {
  email: string
  captchaToken?: string
  remoteip?: string
  verificationBaseUrl?: string
  draft: RegistrationLinkDraft
}): Promise<void> {
  const config = getConfig()
  const email = params.email.trim().toLowerCase()
  const redis = getRedis()
  if (!redis) {
    throw new ServiceUnavailableError(
      'Registro con verificación no disponible. Configura Upstash Redis (UPSTASH_*).',
      'OTP_STORE_UNAVAILABLE',
    )
  }

  const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (existingUser) {
    throw new BadRequestError('Ya existe un usuario con este email')
  }

  const key = pendingKey(email)
  const rawPrev = await redis.get(key)
  const prev = parsePendingRegBlob(rawPrev)
  const isResend = Boolean(prev?.draft && typeof prev.h === 'string' && prev.h.length > 0)

  if (prev && prev.sc >= 3) {
    throw new TooManyRequestsError(
      'Límite de envíos alcanzado. Espera o vuelve más tarde.',
      undefined,
      'LINK_SEND_LIMIT',
    )
  }

  if (!isResend) {
    const cap = params.captchaToken?.trim()
    if (!cap) {
      throw new BadRequestError('Captcha requerido', 'CAPTCHA_FAILED')
    }
    await verifyTurnstileToken(cap, params.remoteip)
  }

  const base = resolveVerificationBaseUrl(params.verificationBaseUrl)

  const draftSource: RegistrationLinkDraft = isResend
    ? prev!.draft
    : (() => {
        const cn = params.draft.companyName?.trim()
        if (!cn) {
          throw new BadRequestError('El nombre de la empresa es requerido')
        }
        return {
          password: params.draft.password,
          firstName: params.draft.firstName?.trim() ?? '',
          lastName: params.draft.lastName?.trim() ?? '',
          companyName: cn,
          workifyEnabled: params.draft.workifyEnabled,
          posEnabled: params.draft.posEnabled,
          technicalServicesEnabled: params.draft.technicalServicesEnabled,
        }
      })()

  const token = randomBytes(32).toString('base64url')
  const pepper = effectivePepper(config)
  const h = hashLinkToken(token, email, pepper)
  const next: PendingRegBlob = {
    h,
    sc: (prev?.sc ?? 0) + 1,
    fc: 0,
    draft: draftSource,
  }
  await redis.set(key, JSON.stringify(next), { ex: config.OTP_CHALLENGE_TTL_SECONDS })

  const verifyUrl = `${base}/register/verify?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`
  await sendRegistrationMagicLinkEmail(email, verifyUrl)
}

/** Valida el enlace, lee el borrador en Redis y completa el alta (BD + sesión vía controller). */
export async function completeRegistrationFromLink(params: {
  email: string
  token: string
}): Promise<RegisterResult> {
  const config = getConfig()
  const email = params.email.trim().toLowerCase()
  const token = params.token.trim()
  if (token.length < 32) {
    throw new BadRequestError('Enlace inválido o incompleto', 'INVALID_LINK')
  }

  const redis = getRedis()
  if (!redis) {
    throw new ServiceUnavailableError(
      'Registro con verificación no disponible.',
      'OTP_STORE_UNAVAILABLE',
    )
  }
  const pepper = effectivePepper(config)
  const key = pendingKey(email)
  const raw = await redis.get(key)
  const blob = parsePendingRegBlob(raw)
  if (!blob?.draft) {
    throw new BadRequestError('Enlace inválido o expirado', 'LINK_EXPIRED')
  }

  const tryHash = hashLinkToken(token, email, pepper)
  const a = Buffer.from(blob.h, 'hex')
  const b = Buffer.from(tryHash, 'hex')
  const ok = a.length === b.length && timingSafeEqual(a, b)
  if (!ok) {
    blob.fc += 1
    if (blob.fc >= 3) {
      await redis.del(key)
      throw new TooManyRequestsError(
        'Demasiados intentos fallidos. Solicita un nuevo enlace.',
        undefined,
        'LINK_VERIFY_LOCKOUT',
      )
    }
    await redis.set(key, JSON.stringify(blob), { ex: config.OTP_CHALLENGE_TTL_SECONDS })
    throw new BadRequestError('Enlace inválido', 'INVALID_LINK')
  }

  // Borrar el pending solo tras alta exitosa: si register falla, el usuario puede reintentar el mismo enlace.
  const registrationTicket = await issueRegistrationTicket(email)
  const result = await authService.register({
    email,
    password: blob.draft.password,
    firstName: blob.draft.firstName,
    lastName: blob.draft.lastName,
    companyName: blob.draft.companyName,
    workifyEnabled: blob.draft.workifyEnabled,
    posEnabled: blob.draft.posEnabled,
    technicalServicesEnabled: blob.draft.technicalServicesEnabled,
    registrationTicket,
  })
  await redis.del(key)
  return result
}
