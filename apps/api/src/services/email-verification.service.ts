import { createHash, randomBytes } from 'node:crypto'
import { prisma } from '../db/index.js'
import { getConfig } from '../core/config.js'
import { BadRequestError } from '../common/errors/app-error.js'
import { sendEmailVerificationLink } from './mailer.service.js'

function hashVerificationToken(token: string): string {
  return createHash('sha256').update(token.trim()).digest('hex')
}

export async function verifyEmailWithToken(token: string): Promise<{ message: string }> {
  if (!token?.trim()) throw new BadRequestError('Token requerido')
  const h = hashVerificationToken(token)
  const user = await prisma.user.findFirst({
    where: {
      verificationTokenHash: h,
      verificationTokenExpiry: { gt: new Date() },
    },
    select: { id: true },
  })
  if (!user) throw new BadRequestError('Enlace inválido o expirado')
  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      verificationTokenHash: null,
      verificationTokenExpiry: null,
    },
  })
  return { message: 'Email verificado correctamente' }
}

/**
 * Reenvía enlace de verificación post-registro (distinto del OTP pre-registro).
 * Respuesta genérica para no enumerar emails.
 */
export async function resendVerificationEmail(email: string): Promise<{ message: string }> {
  const norm = email.trim().toLowerCase()
  const user = await prisma.user.findFirst({
    where: { email: norm },
    select: { id: true, email: true, emailVerified: true },
  })
  const generic = { message: 'Si existe una cuenta con ese email, recibirás instrucciones en breve.' }
  if (!user || user.emailVerified || !user.email) {
    return generic
  }
  const plain = randomBytes(32).toString('hex')
  const hash = hashVerificationToken(plain)
  const exp = new Date(Date.now() + 24 * 60 * 60 * 1000)
  await prisma.user.update({
    where: { id: user.id },
    data: { verificationTokenHash: hash, verificationTokenExpiry: exp },
  })
  const config = getConfig()
  const base = config.HUB_PUBLIC_URL.replace(/\/$/, '')
  const url = `${base}/verify-email?token=${encodeURIComponent(plain)}`
  await sendEmailVerificationLink(user.email, url)
  return generic
}
