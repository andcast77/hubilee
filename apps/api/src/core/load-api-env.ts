import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { config as loadDotenv } from 'dotenv'

let loaded = false

/**
 * Pick the env file from the **process launcher** (`process.env` already set
 * by npm scripts, Docker, or Vercel) — never from values inside a .env file.
 *
 * - `VERCEL=1` or `NODE_ENV=production` → `.env`
 * - otherwise (`development` / `test` from scripts) → `.env.local`
 *
 * Dotenv does not override keys already present, so launcher `NODE_ENV` wins
 * over `NODE_ENV=` inside the file.
 */
function resolveEnvFileName(): '.env' | '.env.local' {
  if (process.env.VERCEL === '1' || process.env.NODE_ENV === 'production') {
    return '.env'
  }
  return '.env.local'
}

/**
 * Load exactly one env file. Idempotent across `server.ts`, `envPlugin`, `db/client`.
 */
export function loadApiEnvFiles(apiRootDir: string): void {
  if (loaded) return
  loaded = true

  const envPath = join(apiRootDir, resolveEnvFileName())
  if (existsSync(envPath)) {
    loadDotenv({ path: envPath })
  }
}
