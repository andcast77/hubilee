/**
 * Carga un solo archivo según `process.env` (prod → `.env`, else → `.env.local`),
 * mismo criterio que `server.ts`, para tests que llaman `getConfig()`.
 */
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadApiEnvFiles } from '../core/load-api-env.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
loadApiEnvFiles(join(__dirname, '..', '..'))

// Integration tests must not call Upstash; empty values keep env schema valid and skip Redis.
if (process.env.VITEST === 'true' || process.env.NODE_ENV === 'test') {
  process.env.UPSTASH_REDIS_REST_URL = ''
  process.env.UPSTASH_REDIS_REST_TOKEN = ''
}
