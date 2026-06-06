import { defineConfig } from 'prisma/config'
import { loadProjectEnv } from './lib/load-env'
import { resolvePrismaCliDatabaseUrl } from './lib/pg-connection-string'

loadProjectEnv()

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'node prisma/seed.mjs',
  },
  datasource: {
    url: resolvePrismaCliDatabaseUrl(),
  },
})
