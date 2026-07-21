/**
 * Carga `apps/api/.env` si existe (mismo criterio que `server.ts`), para tests que llaman `getConfig()`.
 */
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config as loadDotenv } from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dirname, '..', '..', '.env')
if (existsSync(envPath)) {
  loadDotenv({ path: envPath })
}

// Integration tests must not call Upstash; empty values keep env schema valid and skip Redis.
if (process.env.VITEST === 'true' || process.env.NODE_ENV === 'test') {
  process.env.UPSTASH_REDIS_REST_URL = ''
  process.env.UPSTASH_REDIS_REST_TOKEN = ''
}
