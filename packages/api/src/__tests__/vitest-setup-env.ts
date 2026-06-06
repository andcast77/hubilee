/**
 * Carga `packages/api/.env` si existe (mismo criterio que `server.ts`), para tests que llaman `getConfig()`.
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

// Integration tests must not call Upstash; cache layer falls back to DB when unset.
if (process.env.VITEST === 'true' || process.env.NODE_ENV === 'test') {
  delete process.env.UPSTASH_REDIS_REST_URL
  delete process.env.UPSTASH_REDIS_REST_TOKEN
}
