import bcrypt from 'bcryptjs'
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
import { sendPasswordResetOtpEmail } from './mailer.service.js'
import {
  issuePasswordResetTicket,
  verifyAndConsumePasswordResetTicket,
} from './password-reset-ticket.service.js'

type Challenge = { h: string; sc: number; fc: number }

function challengeKey(email: string): string {
  return `pwreset:ch:${Buffer.from(email.trim().toLowerCase()).toString('base64url')}`
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

export async function sendPasswordResetOtp(params: {
  email: string
  captchaToken?: string
  remoteip?: string
}): Promise<{ sent: true }> {
  const config = getConfig()
  const email = params.email.trim().toLowerCase()
  const redis = getRedis()
  if (!redis) {
    throw new ServiceUnavailableError(
      'Restablecimiento no disponible. Configura Upstash Redis (UPSTASH_*).',
      'OTP_STORE_UNAVAILABLE',
    )
  }

  await verifyTurnstileToken(params.captchaToken ?? '', params.remoteip)

  const user = await prisma.user.findFirst({
    where: { email, isActive: true },
    select: { id: true, email: true, password: true },
  })

  // Enumeration-safe: always succeed-looking when user missing or has no password.
  if (!user?.password) {
    return { sent: true }
  }

  const key = challengeKey(email)
  const raw = await redis.get(key)
  let prev: Challenge | null = null
  if (raw && typeof raw === 'string') {
    try {
      prev = JSON.parse(raw) as Challenge
    } catch {
      prev = null
    }
  }
  if (prev && prev.sc >= 3) {
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
  await sendPasswordResetOtpEmail(email, code)
  return { sent: true }
}

export async function verifyPasswordResetOtp(params: {
  email: string
  code: string
}): Promise<{ resetTicket: string }> {
  const config = getConfig()
  const email = params.email.trim().toLowerCase()
  const code = params.code.trim()
  const redis = getRedis()
  if (!redis) {
    throw new ServiceUnavailableError(
      'Restablecimiento no disponible.',
      'OTP_STORE_UNAVAILABLE',
    )
  }
  const pepper = effectivePepper(config)
  const key = challengeKey(email)
  const raw = await redis.get(key)
  if (!raw || typeof raw !== 'string') {
    throw new BadRequestError('Código inválido o expirado', 'INVALID_OTP')
  }
  let ch: Challenge
  try {
    ch = JSON.parse(raw) as Challenge
  } catch {
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
  const resetTicket = await issuePasswordResetTicket(email)
  return { resetTicket }
}

export async function completePasswordReset(params: {
  email: string
  resetTicket: string
  newPassword: string
}): Promise<{ ok: true }> {
  const config = getConfig()
  const email = params.email.trim().toLowerCase()
  await verifyAndConsumePasswordResetTicket(config, email, params.resetTicket)

  const user = await prisma.user.findFirst({
    where: { email, isActive: true },
    select: { id: true, password: true },
  })
  if (!user?.password) {
    throw new BadRequestError('No se pudo restablecer la contraseña', 'RESET_USER_INVALID')
  }

  const hashedPassword = await bcrypt.hash(params.newPassword, 10)
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      failedLoginAttempts: 0,
      lockedUntil: null,
      // Design default: do not clear Prisma passwordResetToken* fields (unused).
    },
  })

  return { ok: true }
}
