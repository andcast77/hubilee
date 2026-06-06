import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'

/** Carga `.env`, `.env.local` y en CI (p. ej. GitHub Actions) `.env.ci` sin secrets en el panel. */
export function loadProjectEnv(): void {
  const root = process.cwd()
  loadEnv({ path: resolve(root, '.env') })
  loadEnv({ path: resolve(root, '.env.local'), override: true })
  if (process.env.CI === 'true') {
    loadEnv({ path: resolve(root, '.env.ci') })
  }
}
