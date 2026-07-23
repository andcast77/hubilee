import { Resend } from 'resend'
import { getConfig } from '../core/config.js'
import { BadRequestError, ServiceUnavailableError } from '../common/errors/app-error.js'

/** Parse `Hubilee <a@b.com>` or `a@b.com` for Resend `from` string. */
function parseMailFrom(from: string): { name?: string; email: string } {
  const m = from.match(/^(.+?)\s*<([^>]+)>$/s)
  if (m) {
    const name = m[1].trim().replace(/^["']|["']$/g, '')
    return { name: name || undefined, email: m[2].trim() }
  }
  return { email: from.trim() }
}

function formatResendFrom(sender: { name?: string; email: string }): string {
  if (sender.name) return `${sender.name} <${sender.email}>`
  return sender.email
}

async function sendMailResend(opts: {
  to: string
  subject: string
  text: string
  html?: string
}): Promise<void> {
  const c = getConfig()
  const apiKey = c.RESEND_API_KEY?.trim() ?? ''
  const fromRaw = c.MAIL_FROM?.trim() ?? ''
  const sender = parseMailFrom(fromRaw)
  const resend = new Resend(apiKey)

  const html = opts.html != null && opts.html.trim() !== '' ? opts.html : opts.text

  const { data, error } = await resend.emails.send({
    from: formatResendFrom(sender),
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html,
  })

  if (error != null) {
    if (c.NODE_ENV !== 'production') {
      console.error('[mailer] Resend send failed:', error.message)
    }
    throw new ServiceUnavailableError(
      'No se pudo enviar el correo de verificación. Revisa RESEND_API_KEY, dominio verificado en Resend, o usa onboarding@resend.dev en desarrollo.',
      'MAIL_SEND_FAILED',
    )
  }

  if (c.NODE_ENV !== 'production' && data?.id) {
    console.info(
      `[mailer] Resend aceptó el envío (id=${data.id}). Si no ves el mail: spam, demora, o panel Resend → Emails.`,
    )
  }
}

/** Correo transaccional vía Resend (https://resend.com/docs/api-reference/emails/send-email). */
export async function sendMail(opts: {
  to: string
  subject: string
  text: string
  html?: string
}): Promise<void> {
  const c = getConfig()
  const from = c.MAIL_FROM?.trim()
  const apiKey = c.RESEND_API_KEY?.trim() ?? ''

  if (!from) {
    if (c.NODE_ENV === 'production') {
      throw new BadRequestError(
        'Envío de correo no configurado (MAIL_FROM y RESEND_API_KEY)',
        'MAIL_NOT_CONFIGURED',
      )
    }
    throw new BadRequestError(
      'Correo no configurado. Define RESEND_API_KEY y MAIL_FROM en apps/api/.env — ver .env.example.',
      'MAIL_NOT_CONFIGURED',
    )
  }

  if (!apiKey) {
    throw new BadRequestError(
      'Resend: define RESEND_API_KEY y un remitente permitido (dominio verificado o onboarding@resend.dev en pruebas).',
      'MAIL_NOT_CONFIGURED',
    )
  }
  if (/placeholder|replace_with|changeme/i.test(apiKey)) {
    throw new BadRequestError(
      'RESEND_API_KEY parece un marcador. Crea una API key en Resend y configura MAIL_FROM.',
      'MAIL_NOT_CONFIGURED',
    )
  }

  await sendMailResend(opts)
}

/** OTP para registro de empresa (PLAN-39). */
export async function sendRegistrationOtpEmail(to: string, code: string): Promise<void> {
  await sendMail({
    to,
    subject: 'Tu código de verificación — Hubilee',
    text: `Tu código es: ${code}\n\nVálido unos minutos. Si no solicitaste este registro, ignora este mensaje.`,
    html: `<p>Tu código es: <strong>${code}</strong></p><p>Válido unos minutos. Si no solicitaste este registro, ignora este mensaje.</p>`,
  })
}

/** OTP para restablecer contraseña (Pos). Never log `code`. */
export async function sendPasswordResetOtpEmail(to: string, code: string): Promise<void> {
  await sendMail({
    to,
    subject: 'Tu código para restablecer la contraseña — Hubilee',
    text: `Tu código es: ${code}\n\nVálido unos minutos. Si no solicitaste restablecer tu contraseña, ignora este mensaje.`,
    html: `<p>Tu código es: <strong>${code}</strong></p><p>Válido unos minutos. Si no solicitaste restablecer tu contraseña, ignora este mensaje.</p>`,
  })
}

/** Enlace de un solo uso para continuar el registro (PLAN-40). */
export async function sendRegistrationMagicLinkEmail(to: string, verifyUrl: string): Promise<void> {
  await sendMail({
    to,
    subject: 'Confirma tu email para continuar el registro — Hubilee',
    text: `Abre este enlace para continuar con el registro de tu empresa:\n\n${verifyUrl}\n\nVálido unos minutos. Si no solicitaste crear una cuenta, ignora este mensaje.`,
    html: `<p><a href="${verifyUrl}">Continuar registro</a></p><p>Válido unos minutos. Si no solicitaste crear una cuenta, ignora este mensaje.</p>`,
  })
}

export async function sendEmailVerificationLink(to: string, verifyUrl: string): Promise<void> {
  await sendMail({
    to,
    subject: 'Verifica tu email — Hubilee',
    text: `Abre este enlace para verificar tu cuenta:\n${verifyUrl}`,
    html: `<p><a href="${verifyUrl}">Verificar email</a></p>`,
  })
}
