import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'prisma/config'
import { loadApiEnvFiles } from './src/core/load-api-env.js'
import { resolveDbUrls } from './scripts/prisma/db-target-env'

loadApiEnvFiles(join(dirname(fileURLToPath(import.meta.url))))

const { databaseUrl, shadowDatabaseUrl } = resolveDbUrls()

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: databaseUrl,
    ...(shadowDatabaseUrl && { shadowDatabaseUrl }),
  },
})
