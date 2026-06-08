/** Prisma 7 driver adapter selection (Pg vs Neon serverless). */
export function usePgAdapter(connectionString: string): boolean {
  if (process.env.PRISMA_USE_PG_ADAPTER === 'true') return true
  if (process.env.PRISMA_USE_PG_ADAPTER === 'false') return false
  // Neon pooler/direct hosts; everything else (localhost, docker `postgres`, etc.) uses pg.
  return !connectionString.includes('neon.tech')
}
