/**
 * Configuración centralizada desde `process.env` (cargado desde `apps/api/.env` en local).
 * Lista de variables: `.env.example` (referencia). Local: `apps/api/.env`. Vercel: panel.
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
  /** Mínimo de segundos entre escrituras de `Session.lastSeenAt` por sesión (reduce carga DB). Mínimo efectivo 30. */
  SESSION_LAST_SEEN_THROTTLE_SECONDS: number
  TRUST_PROXY: string
  FIELD_ENCRYPTION_KEY: string
  /** Issuer label in authenticator apps (otpauth URI). */
  MFA_TOTP_ISSUER: string
  /** Cloudflare Turnstile secret (siteverify). Empty in dev may skip verification (see turnstile service). */
  TURNSTILE_SECRET_KEY: string
  /** HMAC pepper for OTP code hashing (min 16 chars recommended in production). */
  OTP_PEPPER: string
  /** Optional; defaults to JWT_SECRET when unset. */
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

/** Empty/undefined → defaultVal; true/1/yes → true; false/0/no → false; other → defaultVal. */
function parseEnvBool(raw: string | undefined, defaultVal: boolean): boolean {
  if (raw == null || raw.trim() === '') return defaultVal
  const v = raw.trim().toLowerCase()
  if (v === 'true' || v === '1' || v === 'yes') return true
  if (v === 'false' || v === '0' || v === 'no') return false
  return defaultVal
}

/** Solo desarrollo: nunca commitear secretos reales; prod/staging debe definir env. */
function devJwtSecret(nodeEnv: string): string {
  return nodeEnv === 'production' ? '' : 'dev-secret-change-in-production'
}

function devOtpPepper(nodeEnv: string): string {
  return nodeEnv === 'production' ? '' : 'dev-otp-pepper-change-me'
}

export function getConfig(): AppConfig {
  const nodeEnv = (process.env.NODE_ENV ?? '').trim() || 'development'
  const jwtSecret = (process.env.JWT_SECRET ?? '').trim() || devJwtSecret(nodeEnv)
  const otpPepper = (process.env.OTP_PEPPER ?? '').trim() || devOtpPepper(nodeEnv)

  return {
    PORT: (process.env.PORT ?? '').trim() || '3000',
    CORS_ORIGIN:
      (process.env.CORS_ORIGIN ?? '').trim() ||
      'http://localhost:3001,http://localhost:3002,http://localhost:3003,http://localhost:3004',
    DATABASE_URL: (process.env.DATABASE_URL ?? '').trim(),
    NODE_ENV: nodeEnv,
    JWT_SECRET: jwtSecret,
    JWT_ACCESS_EXPIRES_IN: (process.env.JWT_ACCESS_EXPIRES_IN ?? '').trim() || '15m',
    REFRESH_TOKEN_EXPIRES_IN: (process.env.REFRESH_TOKEN_EXPIRES_IN ?? '').trim() || '30d',
    MAX_LOGIN_ATTEMPTS: parsePositiveInt(process.env.MAX_LOGIN_ATTEMPTS) || 5,
    LOCKOUT_DURATION_MINUTES: parsePositiveInt(process.env.LOCKOUT_DURATION_MINUTES) || 15,
    SESSION_LAST_SEEN_THROTTLE_SECONDS: Math.max(
      30,
      parsePositiveInt(process.env.SESSION_LAST_SEEN_THROTTLE_SECONDS) || 300,
    ),
    TRUST_PROXY: (process.env.TRUST_PROXY ?? '').trim(),
    FIELD_ENCRYPTION_KEY: (process.env.FIELD_ENCRYPTION_KEY ?? '').trim(),
    MFA_TOTP_ISSUER: (process.env.MFA_TOTP_ISSUER ?? '').trim() || 'Hubilee',
    TURNSTILE_SECRET_KEY: (process.env.TURNSTILE_SECRET_KEY ?? '').trim(),
    OTP_PEPPER: otpPepper,
    REGISTRATION_TICKET_SECRET: (process.env.REGISTRATION_TICKET_SECRET ?? '').trim(),
    REGISTRATION_TICKET_EXPIRES_IN: (process.env.REGISTRATION_TICKET_EXPIRES_IN ?? '').trim() || '15m',
    OTP_CHALLENGE_TTL_SECONDS: parsePositiveInt(process.env.OTP_CHALLENGE_TTL_SECONDS) || 900,
    RESEND_API_KEY: (process.env.RESEND_API_KEY ?? '').trim(),
    MAIL_FROM: (process.env.MAIL_FROM ?? '').trim(),
    HUB_PUBLIC_URL: (process.env.HUB_PUBLIC_URL ?? '').trim() || 'http://localhost:3001',
  }
}

/** Secret used to sign `registrationTicket` JWTs. */
export function getRegistrationTicketSecret(config: AppConfig): string {
  const s = config.REGISTRATION_TICKET_SECRET?.trim()
  if (s) return s
  return config.JWT_SECRET
}
