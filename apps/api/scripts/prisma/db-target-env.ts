type DbTarget = 'dev' | 'prod'

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`[db-target] Missing required environment variable: ${name}`)
  }
  return value
}

function optionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim()
  return value || undefined
}

export function resolveDbTarget(): DbTarget {
  const raw = (process.env.DB_TARGET || 'prod').trim().toLowerCase()
  if (raw === 'dev' || raw === 'prod') return raw
  throw new Error(`[db-target] Invalid DB_TARGET "${process.env.DB_TARGET}". Use "dev" or "prod".`)
}

export function resolveDbUrls(target = resolveDbTarget()): {
  target: DbTarget
  databaseUrl: string
  shadowDatabaseUrl?: string
} {
  if (target === 'dev') {
    const databaseUrl = requiredEnv('DATABASE_URL_DEV')
    const shadowDatabaseUrl =
      optionalEnv('SHADOW_DATABASE_URL_DEV') ||
      databaseUrl.replace(/\/[^/]*(\?.*)?$/, '/hubilee_shadow$1')

    return {
      target,
      databaseUrl,
      shadowDatabaseUrl,
    }
  }

  const databaseUrl = requiredEnv('DATABASE_URL')

  return {
    target,
    databaseUrl,
    shadowDatabaseUrl: optionalEnv('SHADOW_DATABASE_URL'),
  }
}
