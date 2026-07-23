/**
 * Rate limits key off `request.ip`. Enable `TRUST_PROXY` (see `.env.example`) when the API sits
 * behind a reverse proxy or Vercel so forwarded headers resolve to the real client; otherwise every
 * user can share one bucket (proxy IP). @see https://fastify.dev/docs/latest/Guides/Recommendations/
 */
import rateLimit from '@fastify/rate-limit'
import type { FastifyPluginAsync } from 'fastify'
import * as authController from '../../controllers/v1/auth.controller.js'

function pathOnly(url: string): string {
  return url.split('?')[0]
}

/** Exported for unit tests — Google OAuth uses dedicated `ms-auth-google` bucket (20/min). */
export const GOOGLE_OAUTH_RATE_LIMIT_MAX = 20

/** Public auth paths that use a dedicated bucket (not the global IP bucket). */
export function isAuthPublicPath(url: string): boolean {
  const p = pathOnly(url)
  return (
    p === '/v1/auth/login' ||
    // @deprecated thin alias of login({ userCode }); keep rate-limited with public auth until removed
    p === '/v1/auth/floor-login' ||
    p === '/v1/auth/register' ||
    p === '/v1/auth/verify' ||
    p === '/v1/auth/refresh' ||
    p === '/v1/auth/register/otp/send' ||
    p === '/v1/auth/register/otp/verify' ||
    p === '/v1/auth/register/link/send' ||
    p === '/v1/auth/register/link/verify' ||
    p === '/v1/auth/password-reset/otp/send' ||
    p === '/v1/auth/password-reset/otp/verify' ||
    p === '/v1/auth/password-reset' ||
    p === '/v1/auth/verify-email' ||
    p === '/v1/auth/resend-verification' ||
    p === '/v1/auth/google' ||
    p === '/v1/auth/google/callback'
  )
}

export function isGoogleOAuthPath(url: string): boolean {
  const p = pathOnly(url)
  return p === '/v1/auth/google' || p === '/v1/auth/google/callback'
}

/** Vercel Cron → GET /v1/internal/cron/* — do not count toward the global IP bucket. */
function isInternalCronPath(url: string): boolean {
  return pathOnly(url).startsWith('/v1/internal/cron/')
}

export const rateLimitPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    skip: (request) => isAuthPublicPath(request.url) || isInternalCronPath(request.url)
  } as Parameters<typeof fastify.register>[1])

  await fastify.register(async function authPublicScope(f) {
    await f.register(rateLimit, {
      max: 20,
      timeWindow: '1 minute',
      name: 'ms-auth-public'
    } as Parameters<typeof f.register>[1])

    await authController.registerPublicAuthRoutes(f)
  })

  await fastify.register(async function registerOtpScope(f) {
    await f.register(rateLimit, {
      max: 15,
      timeWindow: '15 minutes',
      name: 'ms-auth-register-otp',
    } as Parameters<typeof f.register>[1])

    await authController.registerRegisterOtpRoutes(f)
  })

  await fastify.register(async function passwordResetOtpScope(f) {
    await f.register(rateLimit, {
      max: 15,
      timeWindow: '15 minutes',
      name: 'ms-auth-password-reset-otp',
    } as Parameters<typeof f.register>[1])

    await authController.registerPasswordResetOtpRoutes(f)
  })

  await fastify.register(async function registerLinkScope(f) {
    await f.register(rateLimit, {
      max: 15,
      timeWindow: '15 minutes',
      name: 'ms-auth-register-link',
    } as Parameters<typeof f.register>[1])

    await authController.registerRegisterLinkRoutes(f)
  })

  await fastify.register(async function mfaVerifyScope(f) {
    await f.register(rateLimit, {
      max: 5,
      timeWindow: '15 minutes',
      name: 'ms-auth-mfa-verify',
    } as Parameters<typeof f.register>[1])

    await authController.registerMfaAuthRoutes(f)
  })

  await fastify.register(async function googleOAuthScope(f) {
    await f.register(rateLimit, {
      max: GOOGLE_OAUTH_RATE_LIMIT_MAX,
      timeWindow: '1 minute',
      name: 'ms-auth-google',
    } as Parameters<typeof f.register>[1])

    await authController.registerGoogleAuthRoutes(f)
  })
}

