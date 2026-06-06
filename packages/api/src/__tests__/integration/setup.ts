/**
 * Integration test setup with testcontainers.
 *
 * To use testcontainers, install: pnpm add -D testcontainers @testcontainers/postgresql
 * Then uncomment the PostgreSqlContainer setup below.
 *
 * For now, integration tests run against the DATABASE_URL environment variable
 * (set in CI via GitHub Actions postgres service).
 */
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { beforeAll, afterAll } from 'vitest'
import { Client } from 'pg'

const GLOBAL_DB_INIT_KEY = '__MS_INTEGRATION_TEST_DB_INIT_DONE__'

// Ensure the API Fastify app bootstraps in test mode (no listen()).
process.env.NODE_ENV = 'test'
process.env.VITEST = 'true'
process.env.VERCEL = '1'

// Deterministic JWT secret for generated test tokens.
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret-for-users-auth-regression'

// Avoid Upstash network calls in integration tests (cache falls back to DB when unset).
delete process.env.UPSTASH_REDIS_REST_URL
delete process.env.UPSTASH_REDIS_REST_TOKEN

// Uncomment when testcontainers is installed:
// import { PostgreSqlContainer } from '@testcontainers/postgresql'
//
// let container: Awaited<ReturnType<PostgreSqlContainer['start']>>
//
// beforeAll(async () => {
//   container = await new PostgreSqlContainer('postgres:16-alpine').start()
//   process.env.DATABASE_URL = container.getConnectionUri()
//   // Run migrations here
// }, 60_000)
//
// afterAll(async () => {
//   await container?.stop()
// })

beforeAll(async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL must be set for integration tests. ' +
        'Use docker-compose up -d or install @testcontainers/postgresql.'
    )
  }

  if ((globalThis as any)[GLOBAL_DB_INIT_KEY]) return
  ;(globalThis as any)[GLOBAL_DB_INIT_KEY] = true

  let skipSeed = false

  const setupFileDir = path.dirname(fileURLToPath(import.meta.url))
  const repoRoot = path.resolve(setupFileDir, '../../../../../')

  // Keep DB state deterministic for authorization regression tests.
  try {
    execSync('pnpm --filter @multisystem/database migrate:deploy', {
      cwd: repoRoot,
      // Capture output so we can detect specific Prisma migration errors (e.g. P3015).
      stdio: 'pipe',
      encoding: 'utf8',
    })
  } catch (err: unknown) {
    const msg = (() => {
      const base = err instanceof Error ? err.message : String(err)
      const anyErr = err as any
      const stdout = typeof anyErr?.stdout === 'string' ? anyErr.stdout : anyErr?.stdout?.toString?.()
      const stderr = typeof anyErr?.stderr === 'string' ? anyErr.stderr : anyErr?.stderr?.toString?.()
      return [base, stdout, stderr].filter(Boolean).join('\n')
    })()
    // Local-only fallbacks: Prisma can fail in dev if migration state differs from DB
    // (P3015 missing migration file, P3005 non-empty DB without baseline).
    if (msg.includes('P3015') || msg.includes('P3005')) {
      const dbUrl = process.env.DATABASE_URL
      const isLocal =
        dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1') || dbUrl.includes('host=localhost')

      if (isLocal) {
        // Local-only destructive reset: erase DB objects so we can reconstruct schema.
        // eslint-disable-next-line no-console
        console.warn('[integration] Prisma migrate deploy failed locally; resetting public schema then db:push.')
        const client = new Client({ connectionString: dbUrl })
        await client.connect()
        try {
          await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;')
        } finally {
          await client.end().catch(() => undefined)
        }
      } else {
        // eslint-disable-next-line no-console
        console.warn('[integration] P3015 on migrate deploy; skipping migrate reset (non-local DB).')
      }

      // Reconstruct schema via db push so the seed has tables to operate on.
      execSync('pnpm --filter @multisystem/database db:push', {
        cwd: repoRoot,
        stdio: 'inherit',
      })
    } else {
      throw err
    }
  }
  if (!skipSeed) {
    execSync('pnpm --filter @multisystem/database db:seed', {
      cwd: repoRoot,
      stdio: 'inherit',
    })
  }
}, 120_000)

afterAll(async () => {
  const db = await import('@multisystem/database')
  await db.prisma.$disconnect().catch(() => {
    // Best-effort cleanup; tests should not fail because of teardown.
  })
})
