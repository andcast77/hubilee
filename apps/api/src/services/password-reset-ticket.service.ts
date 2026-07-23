import jwt from 'jsonwebtoken'
import { randomBytes } from 'node:crypto'
import { getRedis } from '../common/cache/redis.js'
import type { AppConfig } from '../core/config.js'
import { getConfig, getRegistrationTicketSecret } from '../core/config.js'
import { BadRequestError } from '../common/errors/app-error.js'

export const PASSWORD_RESET_TICKET_PURPOSE = 'password_reset' as const

export type PasswordResetTicketPayload = {
  sub: string
  purpose: typeof PASSWORD_RESET_TICKET_PURPOSE
  jti: string
}

function jwtExpiresSeconds(config: AppConfig): number {
  const raw = config.REGISTRATION_TICKET_EXPIRES_IN?.trim() || '15m'
  const m = /^(\d+)\s*([smhd])$/i.exec(raw)
  if (!m) return config.OTP_CHALLENGE_TTL_SECONDS
  const n = Number.parseInt(m[1], 10)
  const u = m[2].toLowerCase()
  const mult = u === 's' ? 1 : u === 'm' ? 60 : u === 'h' ? 3600 : 86400
  return n * mult
}

/** Emit JWT + store `jti` in Redis until consumed at password reset. Reuses registration ticket secret. */
export async function issuePasswordResetTicket(email: string): Promise<string> {
  const config = getConfig()
  const redis = getRedis()
  if (!redis) {
    throw new Error('Redis requerido para emitir ticket de restablecimiento')
  }
  const norm = email.trim().toLowerCase()
  const jti = randomBytes(16).toString('hex')
  const secret = getRegistrationTicketSecret(config)
  const ex = jwtExpiresSeconds(config)
  const token = jwt.sign(
    { sub: norm, purpose: PASSWORD_RESET_TICKET_PURPOSE, jti },
    secret,
    { expiresIn: ex },
  )
  await redis.set(`pwreset:jti:${jti}`, norm, { ex: Math.max(60, ex) })
  return token
}

export async function verifyAndConsumePasswordResetTicket(
  config: AppConfig,
  email: string,
  token: string,
): Promise<void> {
  const secret = getRegistrationTicketSecret(config)
  let decoded: PasswordResetTicketPayload
  try {
    decoded = jwt.verify(token, secret) as PasswordResetTicketPayload
  } catch {
    throw new BadRequestError('Ticket de restablecimiento inválido o expirado', 'RESET_TICKET_INVALID')
  }
  if (decoded.purpose !== PASSWORD_RESET_TICKET_PURPOSE || !decoded.jti) {
    throw new BadRequestError('Ticket de restablecimiento inválido', 'RESET_TICKET_INVALID')
  }
  const norm = email.trim().toLowerCase()
  if (decoded.sub !== norm) {
    throw new BadRequestError('El email no coincide con el ticket', 'RESET_EMAIL_MISMATCH')
  }
  const redis = getRedis()
  if (!redis) {
    throw new BadRequestError('No se pudo validar el ticket', 'OTP_STORE_UNAVAILABLE')
  }
  const key = `pwreset:jti:${decoded.jti}`
  const stored = await redis.get(key)
  if (stored !== norm) {
    throw new BadRequestError('Ticket inválido o ya utilizado', 'RESET_TICKET_REUSED')
  }
  await redis.del(key)
}
