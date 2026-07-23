/**
 * Configuración centralizada desde `process.env`.
 * El archivo se elige con el NODE_ENV/VERCEL del **launcher** (scripts/`package.json`),
 * no con el NODE_ENV escrito dentro del .env. Dev → `.env.local`; prod → `.env`.
 * Keys ya seteadas en el proceso no se pisan. Lista: `.env.example`.
 */
export type AppConfig = {
  PORT: string
  CORS_ORIGIN: string
  DATABASE_URL: string
  NODE_ENV: string
  JWT_SECRET: string
  /** Short-lived access JWT (e.g. 15m). */
  JWT_ACCESS_EXPIRES_IN: string
  /** Refresh session cookie / DB session row lifetime (e.g. 30d). */
  REFRESH_TOKEN_EXPIRES_IN: string
  MAX_LOGIN_ATTEMPTS: number
  LOCKOUT_DURATION_MINUTES: number
  /** Segundos entre escrituras de `Session.lastSeenAt` por sesión (reduce carga DB). */
  SESSION_LAST_SEEN_THROTTLE_SECONDS: number
  TRUST_PROXY: string
  FIELD_ENCRYPTION_KEY: string
  /** Issuer label in authenticator apps (otpauth URI). */
  MFA_TOTP_ISSUER: string
  /** Cloudflare Turnstile secret (siteverify). Empty in dev may skip verification (see turnstile service). */
  TURNSTILE_SECRET_KEY: string
  /** HMAC pepper for OTP code hashing (min 16 chars recommended in production). */
  OTP_PEPPER: string
  /** Secret used to sign registration ticket JWTs. */
  REGISTRATION_TICKET_SECRET: string
  /** JWT exp for registration ticket (e.g. 15m). */
  REGISTRATION_TICKET_EXPIRES_IN: string
  /** Redis TTL for OTP challenge (seconds). */
  OTP_CHALLENGE_TTL_SECONDS: number
  /** Resend API key (https://resend.com/docs/api-reference/emails/send-email). */
  RESEND_API_KEY: string
  /** Remitente verificado en el proveedor, p. ej. `Hubilee <noreply@tudominio.com>`. */
  MAIL_FROM: string
  /** Base URL for post-registration email verification links (Hub). */
  HUB_PUBLIC_URL: string
  /** Google OAuth web client id. Empty disables Google auth routes (503). */
  GOOGLE_CLIENT_ID: string
  /** Google OAuth client secret. */
  GOOGLE_CLIENT_SECRET: string
  /** Absolute API callback URL registered in Google Cloud Console. */
  GOOGLE_REDIRECT_URI: string
}

/**
 * Parse TRUST_PROXY for Fastify `trustProxy` (reverse proxy / Vercel).
 * @see https://fastify.dev/docs/latest/Reference/Server/#trustproxy
 */
export function parseTrustProxy(raw: string | undefined): boolean | number {
  if (raw == null || raw.trim() === '') return false
  const v = raw.trim().toLowerCase()
  if (v === 'true' || v === '1' || v === 'yes') return true
  if (v === 'false' || v === '0' || v === 'no') return false
  const n = Number.parseInt(v, 10)
  if (!Number.isNaN(n) && n >= 1 && n <= 32) return n
  return false
}

function parsePositiveInt(raw: string | undefined): number {
  const n = parseInt(raw ?? '', 10)
  return Number.isFinite(n) && n > 0 ? n : 0
}

export function getConfig(): AppConfig {
  return {
    PORT: (process.env.PORT ?? '').trim(),
    CORS_ORIGIN: (process.env.CORS_ORIGIN ?? '').trim(),
    DATABASE_URL: (process.env.DATABASE_URL ?? '').trim(),
    NODE_ENV: (process.env.NODE_ENV ?? '').trim(),
    JWT_SECRET: (process.env.JWT_SECRET ?? '').trim(),
    JWT_ACCESS_EXPIRES_IN: (process.env.JWT_ACCESS_EXPIRES_IN ?? '').trim(),
    REFRESH_TOKEN_EXPIRES_IN: (process.env.REFRESH_TOKEN_EXPIRES_IN ?? '').trim(),
    MAX_LOGIN_ATTEMPTS: parsePositiveInt(process.env.MAX_LOGIN_ATTEMPTS),
    LOCKOUT_DURATION_MINUTES: parsePositiveInt(process.env.LOCKOUT_DURATION_MINUTES),
    SESSION_LAST_SEEN_THROTTLE_SECONDS: parsePositiveInt(process.env.SESSION_LAST_SEEN_THROTTLE_SECONDS),
    TRUST_PROXY: (process.env.TRUST_PROXY ?? '').trim(),
    FIELD_ENCRYPTION_KEY: (process.env.FIELD_ENCRYPTION_KEY ?? '').trim(),
    MFA_TOTP_ISSUER: (process.env.MFA_TOTP_ISSUER ?? '').trim(),
    TURNSTILE_SECRET_KEY: (process.env.TURNSTILE_SECRET_KEY ?? '').trim(),
    OTP_PEPPER: (process.env.OTP_PEPPER ?? '').trim(),
    REGISTRATION_TICKET_SECRET: (process.env.REGISTRATION_TICKET_SECRET ?? '').trim(),
    REGISTRATION_TICKET_EXPIRES_IN: (process.env.REGISTRATION_TICKET_EXPIRES_IN ?? '').trim(),
    OTP_CHALLENGE_TTL_SECONDS: parsePositiveInt(process.env.OTP_CHALLENGE_TTL_SECONDS),
    RESEND_API_KEY: (process.env.RESEND_API_KEY ?? '').trim(),
    MAIL_FROM: (process.env.MAIL_FROM ?? '').trim(),
    HUB_PUBLIC_URL: (process.env.HUB_PUBLIC_URL ?? '').trim(),
    GOOGLE_CLIENT_ID: (process.env.GOOGLE_CLIENT_ID ?? '').trim(),
    GOOGLE_CLIENT_SECRET: (process.env.GOOGLE_CLIENT_SECRET ?? '').trim(),
    GOOGLE_REDIRECT_URI: (process.env.GOOGLE_REDIRECT_URI ?? '').trim(),
  }
}

/** Secret used to sign `registrationTicket` JWTs. */
export function getRegistrationTicketSecret(config: AppConfig): string {
  return config.REGISTRATION_TICKET_SECRET.trim()
}
