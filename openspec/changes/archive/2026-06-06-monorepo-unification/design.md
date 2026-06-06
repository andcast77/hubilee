# Design: Monorepo Unification — Fase 1

## Technical Approach

Move standalone `baro` into `apps/baro/` with zero code changes to baro's runtime imports. Add a Caddy reverse proxy for per-domain routing and unify all 6 apps + per-app Postgres + Caddy into a single `docker-compose.yml`. Fase 1 is pure infrastructure — no code changes to existing apps, no version alignment, no shared packages.

## Architecture Decisions

### Decision: Caddy vs Traefik

| Option | Tradeoff | Verdict |
|--------|----------|---------|
| **Caddy** | Single binary, auto TLS via Let's Encrypt, simple declarative Caddyfile, no dynamic config needed for 6 domains | **Chosen** |
| Traefik | Dynamic service discovery, more complex config, overkill for static domain→container mapping | Rejected |

**Rationale**: 6 fixed subdomains → no dynamic routing needed. Caddy's automatic TLS and minimal config reduce operational cost.

### Decision: Path Aliases — Keep `@/*` vs Rewrite to `@multisystem/baro/*`

| Option | Tradeoff | Verdict |
|--------|----------|---------|
| **Keep `@/*` → `./*`** | Zero import rewrites, consistent with all 5 existing apps (hub, shopflow, etc. all use `@/*`) | **Chosen** |
| Rewrite to `@multisystem/baro/*` | Explicit namespace but diverges from monorepo convention, requires rewriting all baro imports | Rejected |

**Rationale**: No root `tsconfig.json` exists — each app scopes `@/*` in its own `tsconfig.json`. Baro's `@/*` → `./*` works identically after move to `apps/baro/`. Zero runtime changes needed.

### Decision: Generic Dockerfile vs Per-App Dockerfiles

| Option | Tradeoff | Verdict |
|--------|----------|---------|
| **Both** | Generic `Dockerfile.nextjs` provides reusable multi-stage pattern; per-app Dockerfiles in `apps/*/` function as thin wrappers or standalone if app-specific needs (Prisma generate, etc.) | **Chosen** |
| One Dockerfile per app only | Duplication across 6 apps | Rejected |
| Single shared Dockerfile | Too rigid — baro needs Prisma, other apps may not | Rejected |

### Decision: Single Caddyfile vs Dynamic Config

| Option | Tradeoff | Verdict |
|--------|----------|---------|
| **Single Caddyfile** | One file, 6 domain blocks, trivially readable | **Chosen** |
| Caddy API / JSON config | Overkill for 6 fixed routes | Rejected |

### Decision: Baro DB — Separate Postgres or Reuse Existing

| Option | Tradeoff | Verdict |
|--------|----------|---------|
| **Separate `baro-db` service** | Full deployment isolation, matches containerized-deployment spec, no schema collision risk | **Chosen** |
| Reuse existing `postgres` service | Port/schema collision with existing apps, violates per-app isolation requirement | Rejected |

**Rationale**: Each app needs its own Postgres per spec. The existing `postgres` service serves apps (like `@multisystem/api`) that are not getting their own DB in Fase 1. Baro gets `baro-db` mapped to host port 5433 (same as its current standalone `compose.yaml`).

## Data Flow

```
Internet ──→ Caddy (:80/:443)
                │
                ├── baro.multisystem.app ──→ baro:3000 ──→ baro-db:5432
                ├── hub.multisystem.app   ──→ hub:3001
                ├── shopflow.multisystem.app ──→ shopflow:3002
                ├── workify.multisystem.app  ──→ workify:3003
                ├── techservices.multisystem.app ──→ techservices:3004
                └── balance.multisystem.app ──→ balance:3005
                            │
                      caddy_network (internal bridge)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/baro/Dockerfile` | Create | Baro-specific Dockerfile (Prisma + Next.js) |
| `docker/Dockerfile.nextjs` | Create | Generic multi-stage Dockerfile for Next.js apps |
| `Caddyfile` | Create | Caddy reverse proxy with 6 domain blocks + TLS |
| `docker-compose.yml` | Modify | Add Caddy, baro, baro-db services; add caddy_network |
| `pnpm-workspace.yaml` | Modify | Already matches via `apps/*` glob; no structural change |
| `turbo.json` | Modify | Add baro app tasks (build, dev, typecheck, lint) |
| `apps/baro/tsconfig.json` | Modify | Update `paths` to point `@/*` → `./*` (same as current but in new location) |
| `apps/baro/next.config.ts` | Modify | Update `turbopack.root` to monorepo root path |

## Interfaces / Contracts

### Caddyfile Structure

```
baro.multisystem.app {
    reverse_proxy baro:3000
}

hub.multisystem.app {
    reverse_proxy hub:3001
}
# ... remaining 4 apps follow same pattern
```

### Generic Dockerfile Pattern (`docker/Dockerfile.nextjs`)

```dockerfile
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN pnpm fetch

FROM deps AS builder
COPY . .
RUN pnpm install --offline
RUN pnpm --filter <app-name> build

FROM base AS runner
COPY --from=builder /app/apps/<app-name>/.next ./.next
COPY --from=builder /app/apps/<app-name>/public ./public
COPY --from=builder /app/apps/<app-name>/package.json ./
EXPOSE <port>
CMD ["pnpm", "--filter", "<app-name>", "start"]
```

### docker-compose.yml Additions

```yaml
services:
  caddy:
    image: caddy:2-alpine
    ports: ["80:80", "443:443"]
    volumes: [./Caddyfile:/etc/caddy/Caddyfile, caddy_data:/data]
    networks: [caddy_network]

  baro:
    build:
      context: .
      dockerfile: apps/baro/Dockerfile
    ports: ["3000"]
    env_file: apps/baro/.env
    networks: [caddy_network]
    depends_on: [baro-db]

  baro-db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: baro
      POSTGRES_PASSWORD: baro
      POSTGRES_DB: baro
    ports: ["5433:5432"]
    volumes: [baro_pgdata:/var/lib/postgresql/data]
    networks: [caddy_network]
```

### turbo.json Additions

```json
"baro#build": {
  "dependsOn": ["^build"],
  "outputs": [".next/**", "!.next/cache/**"],
  "env": ["DATABASE_URL", "DIRECT_URL"]
}
```

No new `globalEnv` entries needed — baro's env vars overlap with existing entries.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Integration | Caddy proxies correctly | `curl -H "Host: baro.multisystem.app" http://localhost` → 200 from baro |
| Integration | `docker compose up` succeeds | `docker compose up --build -d` → all 8 services healthy |
| Manual | Full stack smoke test | Vist each domain in browser/curl, verify per-app routing |
| Unit | baro build in monorepo | `pnpm --filter baro build` succeeds from root |

No migration required. Rollback: `git revert` commit, delete `apps/baro/` if needed.

## Open Questions

- [ ] Does baro need `prisma generate` in its Dockerfile build stage, or is it handled by `postinstall` + `pnpm fetch`?
- [ ] Confirm domain assignments for all 6 apps (which subdomain each app uses)
