# Baro-specific Dockerfile — extends the generic Next.js pattern with Prisma generate.
#
# Build from the monorepo root:
#   docker build -f apps/baro/Dockerfile --build-arg APP=baro .
#
# Baro needs:
#   1. Prisma Client generation (required at build time for type resolution)
#   2. Prisma schema + migrations bundled for runtime migration deploy
#   3. @prisma/adapter-pg and @prisma/client in serverExternalPackages

ARG NODE_VERSION=20-alpine

# ---------------------------------------------------------------------------
# Stage 1: base
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# ---------------------------------------------------------------------------
# Stage 2: deps — resolve dependency graph and fetch to offline cache
# ---------------------------------------------------------------------------
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/baro/package.json ./apps/baro/package.json
COPY apps/*/package.json ./apps/
COPY packages/*/package.json ./packages/
RUN pnpm fetch

# ---------------------------------------------------------------------------
# Stage 3: builder — install, generate Prisma Client, build Next.js
# ---------------------------------------------------------------------------
FROM deps AS builder
COPY . .
RUN pnpm install --offline

# Generate Prisma Client so Next.js can resolve types during build
RUN cd apps/baro && npx prisma generate

# Build baro via Turborepo
RUN pnpm --filter baro build

# ---------------------------------------------------------------------------
# Stage 4: runner — production image with Prisma + Next.js runtime
# ---------------------------------------------------------------------------
FROM base AS runner
ARG PORT=3000

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Prisma schema + migrations for runtime deploy
COPY --from=builder --chown=nextjs:nodejs /app/apps/baro/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/apps/baro/node_modules/.prisma ./node_modules/.prisma

# Next.js build output
COPY --from=builder --chown=nextjs:nodejs /app/apps/baro/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/apps/baro/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/baro/package.json ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/baro/next.config.ts ./next.config.ts

EXPOSE ${PORT}
ENV PORT=${PORT}
ENV NODE_ENV=production

USER nextjs
CMD ["next", "start"]
