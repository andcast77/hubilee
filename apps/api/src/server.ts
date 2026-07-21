import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import Fastify from 'fastify'
import { corsPlugin } from './plugins/core/cors.plugin.js'
import { envPlugin, getValidatedConfig } from './plugins/core/env.plugin.js'
import { errorsPlugin } from './plugins/core/errors.plugin.js'
import { rateLimitPlugin } from './plugins/core/rate-limit.plugin.js'
import { schemaSanitizerPlugin } from './plugins/core/schema-sanitizer.plugin.js'
import { securityHeadersPlugin } from './plugins/core/security-headers.plugin.js'
import { swaggerPlugin } from './plugins/core/swagger.plugin.js'
import { healthPlugin } from './plugins/health/health.plugin.js'
import { registerV1 } from './controllers/v1/index.js'
import { getConfig, parseTrustProxy, type AppConfig } from './core/config.js'
import { loadApiEnvFiles } from './core/load-api-env.js'
import { startJobRunner, stopJobRunner } from './jobs/runner.js'

// File chosen via process.env (NODE_ENV / VERCEL): prod → `.env`, else → `.env.local`.
const __dirnameApi = dirname(fileURLToPath(import.meta.url))
if (!process.env.VITEST) {
  loadApiEnvFiles(join(__dirnameApi, '..'))
}

const __dirname = __dirnameApi

/** Detrás de Vercel, X-Forwarded-For debe alimentar request.ip (rate limit, auditoría). */
function resolveTrustProxy(): boolean | number {
  const raw = process.env.TRUST_PROXY
  if (raw != null && raw.trim() !== '') return parseTrustProxy(raw)
  if (process.env.VERCEL === '1') return true
  return false
}

const trustProxy = resolveTrustProxy()
const fastify = Fastify({ logger: true, trustProxy })

async function start() {
  try {
    // Registrar y validar variables de entorno
    // Ruta explícita a .env (raíz del proyecto) para que funcione desde cualquier directorio de trabajo
    await fastify.register(envPlugin, { entryDir: __dirname })

    // Obtener configuración validada (disponible después de registrar @fastify/env)
    // Under Vitest we may import/boot the app without an active Fastify "ready" cycle.
    // Fall back to the process.env-backed config helper so integration tests can boot.
    const config = (getValidatedConfig(fastify) as AppConfig | undefined) ?? getConfig()

    if (trustProxy !== false) {
      fastify.log.info({ trustProxy }, 'trustProxy enabled (X-Forwarded-* drive request.ip; needed behind reverse proxy / Vercel for correct rate limits)')
    }

    const isTest = process.env.VITEST === 'true' || process.env.NODE_ENV === 'test'
    const deployed =
      process.env.VERCEL === '1' ||
      config.NODE_ENV === 'production' ||
      config.NODE_ENV === 'staging'
    if (!isTest && deployed && (!config.JWT_SECRET || config.JWT_SECRET.trim() === '')) {
      fastify.log.error('JWT_SECRET is required in deployed environments (production, staging, Vercel).')
      if (process.env.VERCEL) {
        throw new Error('JWT_SECRET is required. Set it in project environment variables.')
      }
      process.exit(1)
    }
    if (
      !isTest &&
      config.NODE_ENV === 'development' &&
      (!config.JWT_SECRET || config.JWT_SECRET.trim() === '')
    ) {
      fastify.log.warn(
        'JWT_SECRET is unset; API falls back to a dev default. Set JWT_SECRET in apps/api/.env for realistic auth behavior.'
      )
    }

    const fieldKey = config.FIELD_ENCRYPTION_KEY
    if (!isTest && deployed && (!fieldKey || fieldKey.trim() === '')) {
      fastify.log.error('FIELD_ENCRYPTION_KEY is required in deployed environments (production, staging, Vercel).')
      if (process.env.VERCEL) {
        throw new Error('FIELD_ENCRYPTION_KEY is required. Set it in project environment variables.')
      }
      process.exit(1)
    }
    if (!isTest && config.NODE_ENV === 'development' && (!fieldKey || fieldKey.trim() === '')) {
      fastify.log.warn(
        'FIELD_ENCRYPTION_KEY is unset; field-level encryption will be unavailable. Generate one with: openssl rand -base64 32'
      )
    }

    // Registrar CORS con orígenes desde .env
    await fastify.register(corsPlugin, { corsOrigin: config.CORS_ORIGIN })
    await fastify.register(securityHeadersPlugin)
    await fastify.register(errorsPlugin)
    await fastify.register(rateLimitPlugin)
    await fastify.register(schemaSanitizerPlugin)
    await fastify.register(swaggerPlugin, { nodeEnv: config.NODE_ENV })
    await fastify.register(healthPlugin)
    await registerV1(fastify)

    // On Vercel we export the app for serverless (no in-process cron). Scheduled jobs run via
    // Vercel Cron → GET /v1/internal/cron/* with Authorization: Bearer CRON_SECRET (see vercel.json).
    // Locally or on a long-lived Node host, node-cron runs the same jobs in-process.
    if (!process.env.VERCEL) {
      const port = parseInt(config.PORT, 10)
      // Hooks must be registered before listen(); onClose still runs when the server stops.
      if (!isTest) {
        fastify.addHook('onClose', async () => {
          stopJobRunner()
        })
      }
      await fastify.listen({ port, host: '0.0.0.0' })
      console.log(`🚀 API server listening on port ${port}`)
      console.log(`📋 CORS origins: ${config.CORS_ORIGIN}`)

      if (!isTest) {
        startJobRunner()
      }
    }
    return fastify
  } catch (err) {
    fastify.log.error(err)
    if (process.env.VERCEL) {
      throw err
    }
    process.exit(1)
  }
}

// Export for Vercel serverless; run listen() when executed directly
const app = await start()
export default app
