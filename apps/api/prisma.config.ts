import 'dotenv/config'
import { defineConfig } from 'prisma/config'
import { resolveDbUrls } from './scripts/prisma/db-target-env'

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
