import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'

/**
 * Adds HTTP security response headers to every reply.
 * HSTS is set with a 1-year max-age; adjust if the service is not HTTPS-only yet.
 * CSP uses a strict 'self' baseline — extend per-module if serving inline scripts.
 */
const securityHeadersPluginFn: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onSend', async (_request, reply) => {
    reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
    reply.header('X-Content-Type-Options', 'nosniff')
    reply.header('X-Frame-Options', 'DENY')
    // Preserve per-reply CSP (e.g. Google OAuth popup bridge nonce) when already set.
    if (!reply.getHeader('Content-Security-Policy')) {
      reply.header('Content-Security-Policy', "default-src 'self'")
    }
    reply.header('X-XSS-Protection', '1; mode=block')
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin')
    reply.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
  })
}

export const securityHeadersPlugin = fp(securityHeadersPluginFn, { name: 'security-headers-plugin' })
