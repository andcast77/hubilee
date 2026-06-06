/** Normaliza query params de URLs Postgres para node-pg / Prisma. */
export function normalizePgConnectionString(connectionString: string): string {
  try {
    const url = new URL(connectionString)
    const ssl = url.searchParams.get('sslmode')
    if (ssl && ['require', 'prefer', 'verify-ca'].includes(ssl.toLowerCase())) {
      url.searchParams.set('sslmode', 'verify-full')
    }
    // Neon a veces incluye channel_binding=require; en Windows Server suele romper node-pg.
    if (url.searchParams.get('channel_binding') === 'require') {
      url.searchParams.delete('channel_binding')
    }
    return url.toString()
  } catch {
    return connectionString
      .replace(/([?&]sslmode=)(prefer|require|verify-ca)(?=&|$)/gi, '$1verify-full')
      .replace(/([?&])channel_binding=require(?=&|$)/gi, '$1')
      .replace(/\?&/, '?')
      .replace(/[?&]$/, '')
  }
}

/** Placeholder para `prisma generate` cuando no hay `.env` (p. ej. CI en postinstall). */
const PRISMA_GENERATE_PLACEHOLDER_URL =
  'postgresql://127.0.0.1:5432/baro?schema=public'

function prismaCliNeedsDatabaseUrl(): boolean {
  return process.argv.some((arg) =>
    /(?:^|\/)(?:migrate|db-push|db-pull|db-seed|seed)(?:\b|\/)/i.test(arg) ||
    /\bmigrate\s+(?:dev|deploy|reset|diff|status)\b/i.test(process.argv.join(' '))
  )
}

/** URL para Prisma CLI (migrate, db push, introspect). Prefiere conexión directa en Neon. */
export function resolvePrismaCliDatabaseUrl(): string {
  const raw = process.env.DIRECT_URL ?? process.env.DATABASE_URL
  if (!raw) {
    if (!prismaCliNeedsDatabaseUrl()) {
      return PRISMA_GENERATE_PLACEHOLDER_URL
    }
    throw new Error('Set DIRECT_URL (Neon direct) or DATABASE_URL for Prisma CLI')
  }
  return normalizePgConnectionString(raw)
}
