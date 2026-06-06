import { existsSync } from 'fs'
import { join } from 'path'
import env from '@fastify/env'
import type { FastifyInstance, FastifyPluginAsync } from 'fastify'
import type { AppConfig } from '../../core/config.js'

export const envSchema = {
  type: 'object',
  required: ['DATABASE_URL'],
  properties: {
    PORT: {
      type: 'string',
      default: '3000'
    },
    CORS_ORIGIN: {
      type: 'string',
      default: 'http://localhost:3001,http://localhost:3002,http://localhost:3003,http://localhost:3004'
    },
    DATABASE_URL: {
      type: 'string'
    },
    NODE_ENV: {
      type: 'string',
      default: 'development'
    },
    JWT_SECRET: {
      type: 'string',
      default: ''
    },
    JWT_ACCESS_EXPIRES_IN: {
      type: 'string',
      default: '15m'
    },
    REFRESH_TOKEN_EXPIRES_IN: {
      type: 'string',
      default: '30d'
    },
    MAX_LOGIN_ATTEMPTS: {
      type: 'string',
      default: '5'
    },
    LOCKOUT_DURATION_MINUTES: {
      type: 'string',
      default: '15'
    },
    SESSION_LAST_SEEN_THROTTLE_SECONDS: {
      type: 'string',
      default: '300'
    },
    UPSTASH_REDIS_REST_URL: {
      type: 'string',
      default: ''
    },
    UPSTASH_REDIS_REST_TOKEN: {
      type: 'string',
      default: ''
    },
    TRUST_PROXY: {
      type: 'string',
      default: ''
    },
    VAPID_SUBJECT: {
      type: 'string',
      default: ''
    },
    VAPID_PUBLIC_KEY: {
      type: 'string',
      default: ''
    },
    VAPID_PRIVATE_KEY: {
      type: 'string',
      default: ''
    },
    FIELD_ENCRYPTION_KEY: {
      type: 'string',
      default: ''
    },
    /** Shared secret for GET /v1/internal/cron/* (Vercel Cron sends Authorization: Bearer <CRON_SECRET>). */
    CRON_SECRET: {
      type: 'string',
      default: ''
    },
    TURNSTILE_SECRET_KEY: { type: 'string', default: '' },
    OTP_PEPPER: { type: 'string', default: '' },
    REGISTRATION_TICKET_SECRET: { type: 'string', default: '' },
    REGISTRATION_TICKET_EXPIRES_IN: { type: 'string', default: '15m' },
    OTP_CHALLENGE_TTL_SECONDS: { type: 'string', default: '900' },
    /** true/1/yes reactiva POST /v1/auth/register/otp/* (defecto: desactivado). */
    REGISTRATION_OTP_ENABLED: { type: 'string', default: 'false' },
    RESEND_API_KEY: { type: 'string', default: '' },
    MAIL_FROM: { type: 'string', default: '' },
    HUB_PUBLIC_URL: { type: 'string', default: 'http://localhost:3001' }
  }
} as const

export type EnvPluginOptions = {
  /**
   * Used to find `../.env` relative to the running entrypoint.
   * In `src/server.ts`, pass `__dirnameApi`.
   */
  entryDir: string
}

export const envPlugin: FastifyPluginAsync<EnvPluginOptions> = async (
  fastify: FastifyInstance,
  opts
) => {
  const envPath = join(opts.entryDir, '..', '.env')
  const dotenvConfig =
    process.env.VITEST !== 'true' && existsSync(envPath) ? { path: envPath } : false

  await fastify.register(env, {
    schema: envSchema,
    dotenv: dotenvConfig
  })
}

export function getValidatedConfig(fastify: FastifyInstance): AppConfig {
  // Available after registering @fastify/env
  return (fastify as any).config as AppConfig
}

