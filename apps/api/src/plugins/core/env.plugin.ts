import { join } from 'path'
import env from '@fastify/env'
import type { FastifyInstance, FastifyPluginAsync } from 'fastify'
import type { AppConfig } from '../../core/config.js'
import { loadApiEnvFiles } from '../../core/load-api-env.js'

/**
 * Keys in `required` must exist in the environment (empty string OK for optional features).
 * PORT / Google OAuth are optional with defaults: serverless may omit PORT; empty Google disables OAuth (503 on those routes).
 */
export const envSchema = {
  type: 'object',
  required: [
    'CORS_ORIGIN',
    'DATABASE_URL',
    'NODE_ENV',
    'JWT_SECRET',
    'JWT_ACCESS_EXPIRES_IN',
    'REFRESH_TOKEN_EXPIRES_IN',
    'MAX_LOGIN_ATTEMPTS',
    'LOCKOUT_DURATION_MINUTES',
    'SESSION_LAST_SEEN_THROTTLE_SECONDS',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
    'TRUST_PROXY',
    'VAPID_SUBJECT',
    'VAPID_PUBLIC_KEY',
    'VAPID_PRIVATE_KEY',
    'FIELD_ENCRYPTION_KEY',
    'MFA_TOTP_ISSUER',
    'CRON_SECRET',
    'TURNSTILE_SECRET_KEY',
    'OTP_PEPPER',
    'REGISTRATION_TICKET_SECRET',
    'REGISTRATION_TICKET_EXPIRES_IN',
    'OTP_CHALLENGE_TTL_SECONDS',
    'RESEND_API_KEY',
    'MAIL_FROM',
    'HUB_PUBLIC_URL',
    'ENABLE_API_DOCS',
  ],
  properties: {
    /** Listen port for local/long-running Node; unused on Vercel inject. */
    PORT: { type: 'string', default: '3000' },
    CORS_ORIGIN: { type: 'string' },
    DATABASE_URL: { type: 'string' },
    NODE_ENV: { type: 'string' },
    JWT_SECRET: { type: 'string' },
    JWT_ACCESS_EXPIRES_IN: { type: 'string' },
    REFRESH_TOKEN_EXPIRES_IN: { type: 'string' },
    MAX_LOGIN_ATTEMPTS: { type: 'string' },
    LOCKOUT_DURATION_MINUTES: { type: 'string' },
    SESSION_LAST_SEEN_THROTTLE_SECONDS: { type: 'string' },
    UPSTASH_REDIS_REST_URL: { type: 'string' },
    UPSTASH_REDIS_REST_TOKEN: { type: 'string' },
    TRUST_PROXY: { type: 'string' },
    VAPID_SUBJECT: { type: 'string' },
    VAPID_PUBLIC_KEY: { type: 'string' },
    VAPID_PRIVATE_KEY: { type: 'string' },
    FIELD_ENCRYPTION_KEY: { type: 'string' },
    MFA_TOTP_ISSUER: { type: 'string' },
    /** Shared secret for GET /v1/internal/cron/* (Vercel Cron sends Authorization: Bearer <CRON_SECRET>). */
    CRON_SECRET: { type: 'string' },
    TURNSTILE_SECRET_KEY: { type: 'string' },
    OTP_PEPPER: { type: 'string' },
    REGISTRATION_TICKET_SECRET: { type: 'string' },
    REGISTRATION_TICKET_EXPIRES_IN: { type: 'string' },
    OTP_CHALLENGE_TTL_SECONDS: { type: 'string' },
    OTP_SEND_MAX: { type: 'string' },
    RESEND_API_KEY: { type: 'string' },
    MAIL_FROM: { type: 'string' },
    HUB_PUBLIC_URL: { type: 'string' },
    ENABLE_API_DOCS: { type: 'string' },
    /** Empty / unset disables Google OAuth (start/callback → 503). */
    GOOGLE_CLIENT_ID: { type: 'string', default: '' },
    GOOGLE_CLIENT_SECRET: { type: 'string', default: '' },
    GOOGLE_REDIRECT_URI: { type: 'string', default: '' },
  },
} as const

export type EnvPluginOptions = {
  /**
   * API root is `join(entryDir, '..')`. Chooses `.env` vs `.env.local`
   * from `process.env.NODE_ENV` / `VERCEL`. In `src/server.ts`, pass `__dirnameApi`.
   */
  entryDir: string
}

export const envPlugin: FastifyPluginAsync<EnvPluginOptions> = async (
  fastify: FastifyInstance,
  opts
) => {
  // Preload the single env file into process.env; disable @fastify/env's dotenv.
  if (process.env.VITEST !== 'true') {
    loadApiEnvFiles(join(opts.entryDir, '..'))
  }

  await fastify.register(env, {
    schema: envSchema,
    dotenv: false,
  })
}

export function getValidatedConfig(fastify: FastifyInstance): AppConfig {
  // Available after registering @fastify/env
  return (fastify as any).config as AppConfig
}
