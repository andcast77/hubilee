import { createHmac, randomInt, timingSafeEqual } from 'node:crypto'
import { prisma } from '../db/index.js'
import { getRedis } from '../common/cache/redis.js'
import { getConfig } from '../core/config.js'
import {
  BadRequestError,
  ServiceUnavailableError,
  TooManyRequestsError,
} from '../common/errors/app-error.js'
import { verifyTurnstileToken } from './turnstile.service.js'
import { sendRegistrationOtpEmail } from './mailer.service.js'
import { issueRegistrationTicket } from './registration-ticket.service.js'

type Challenge = { h: string; sc: number; fc: number }

/** Upstash puede devolver string JSON o el objeto ya parseado. */
function parseChallenge(raw: unknown): Challenge | null {
  if (raw == null) return null
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Challenge
    } catch {
      return null
    }
  }
  if (typeof raw === 'object' && raw !== null && 'h' in raw) {
    return raw as Challenge
  }
  return null
}

function challengeKey(email: string): string {
  return `regotp:ch:${Buffer.from(email.trim().toLowerCase()).toString('base64url')}`
}

function hashOtpCode(code: string, email: string, pepper: string): string {
  return createHmac('sha256', pepper)
    .update(email.toLowerCase().trim())
    .update('|')
    .update(code.trim())
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

export async function sendRegistrationOtp(params: {
  email: string
  captchaToken?: string
  remoteip?: string
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

  const existingUser = await prisma.user.findFirst({ where: { email }, select: { id: true } })
  if (existingUser) {
    throw new BadRequestError('Ya existe un usuario con este email')
  }

  await verifyTurnstileToken(params.captchaToken ?? '', params.remoteip)

  const key = challengeKey(email)
  const prev = parseChallenge(await redis.get(key))
  if (prev && prev.sc >= config.OTP_SEND_MAX) {
    throw new TooManyRequestsError(
      'Límite de envíos de código alcanzado. Espera o vuelve más tarde.',
      undefined,
      'OTP_SEND_LIMIT',
    )
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  const pepper = effectivePepper(config)
  const h = hashOtpCode(code, email, pepper)
  const next: Challenge = {
    h,
    sc: (prev?.sc ?? 0) + 1,
    fc: prev?.fc ?? 0,
  }
  await redis.set(key, JSON.stringify(next), { ex: config.OTP_CHALLENGE_TTL_SECONDS })

  await sendRegistrationOtpEmail(email, code)
}

export async function verifyRegistrationOtp(params: {
  email: string
  code: string
}): Promise<{ registrationTicket: string }> {
  const config = getConfig()
  const email = params.email.trim().toLowerCase()
  const code = params.code.trim()
  const redis = getRedis()
  if (!redis) {
    throw new ServiceUnavailableError(
      'Registro con verificación no disponible.',
      'OTP_STORE_UNAVAILABLE',
    )
  }
  const pepper = effectivePepper(config)
  const key = challengeKey(email)
  const ch = parseChallenge(await redis.get(key))
  if (!ch?.h) {
    throw new BadRequestError('Código inválido o expirado', 'INVALID_OTP')
  }

  const tryHash = hashOtpCode(code, email, pepper)
  const a = Buffer.from(ch.h, 'hex')
  const b = Buffer.from(tryHash, 'hex')
  const ok = a.length === b.length && timingSafeEqual(a, b)
  if (!ok) {
    ch.fc += 1
    if (ch.fc >= 3) {
      await redis.del(key)
      throw new TooManyRequestsError(
        'Demasiados intentos fallidos. Solicita un nuevo código.',
        undefined,
        'OTP_VERIFY_LOCKOUT',
      )
    }
    await redis.set(key, JSON.stringify(ch), { ex: config.OTP_CHALLENGE_TTL_SECONDS })
    throw new BadRequestError('Código incorrecto', 'INVALID_OTP')
  }

  await redis.del(key)
  const registrationTicket = await issueRegistrationTicket(email)
  return { registrationTicket }
}
