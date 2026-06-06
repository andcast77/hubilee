import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { loadProjectEnv } from '@/lib/load-env'
import { normalizePgConnectionString } from '@/lib/pg-connection-string'

loadProjectEnv()

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  pgPool: Pool | undefined
  prismaDatabaseUrl: string | undefined
}

function disconnectPreviousClient(): void {
  const pool = globalForPrisma.pgPool
  const client = globalForPrisma.prisma
  globalForPrisma.pgPool = undefined
  globalForPrisma.prisma = undefined
  globalForPrisma.prismaDatabaseUrl = undefined
  if (pool) void pool.end().catch(() => {})
  if (client) void client.$disconnect().catch(() => {})
}

function createOrReusePrismaClient(): PrismaClient {
  const raw = process.env.DATABASE_URL
  if (!raw) {
    throw new Error('DATABASE_URL environment variable is not set')
  }
  const connectionString = normalizePgConnectionString(raw)

  if (globalForPrisma.prisma && globalForPrisma.prismaDatabaseUrl !== connectionString) {
    disconnectPreviousClient()
  }

  if (!globalForPrisma.pgPool) {
    globalForPrisma.pgPool = new Pool({ connectionString })
    globalForPrisma.prismaDatabaseUrl = connectionString
  }

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      adapter: new PrismaPg(globalForPrisma.pgPool),
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    })
  }

  return globalForPrisma.prisma
}

/**
 * Cliente Prisma con pool pg. En desarrollo, si cambia `DATABASE_URL` (misma ejecución de Node),
 * se cierra el pool anterior para no seguir pegándole a otra base.
 */
function getPrisma(): PrismaClient {
  return createOrReusePrismaClient()
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrisma()
    const value = Reflect.get(client, prop, client) as unknown
    if (typeof value === 'function') {
      return (value as (...a: unknown[]) => unknown).bind(client)
    }
    return value
  },
})

if (process.env.NODE_ENV !== 'production') {
  createOrReusePrismaClient()
}
