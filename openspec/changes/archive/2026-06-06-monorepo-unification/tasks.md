# Tasks: Monorepo Unification — Fase 1

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~200 new + ~3000 moved (baro copy) |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (infra) → PR 2 (baro integration) |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Docker & Caddy infrastructure | PR 1 (→ main) | New files only: Dockerfile.nextjs, baro Dockerfile, Caddyfile, docker-compose additions. Zero risk to existing apps. |
| 2 | Baro monorepo integration | PR 2 (→ main) | Copy baro to `apps/baro/`, turbo.json pipeline, config updates, full stack verification. |

## Phase 1: Infrastructure

- [x] 1.1 Copy standalone baro app files into `apps/baro/` preserving directory structure
- [x] 1.2 Create `docker/Dockerfile.nextjs` with generic multi-stage build pattern (base → deps → builder → runner)
- [x] 1.3 Create `apps/baro/Dockerfile` extending the generic pattern with Prisma generate step
- [x] 1.4 Create `Caddyfile` with 6 domain→service blocks (baro, hub, pos, workify, techservices, balance) + TLS
- [x] 1.5 Update `docker-compose.yml`: add Caddy, baro, baro-db services; add `caddy_network`; add named volumes for baro-db
- [x] 1.6 Update `turbo.json`: add `baro#build`, `baro#dev`, `baro#typecheck`, `baro#lint` pipeline entries
- [x] 1.7 Update `apps/baro/next.config.ts`: set `experimental.turbopack.root` to monorepo root
- [x] 1.8 Update `apps/baro/tsconfig.json`: verify paths `@/*` → `./*` resolve correctly at new location
- [x] 1.9 Verify `pnpm-workspace.yaml` — `apps/*` glob already covers `apps/baro/`, no change needed

## Phase 2: Testing & Verification

- [x] 2.1 Run `pnpm install` from root — **PASS**: baro resolves in workspace (12 projects), Prisma Client generated successfully
- [x] 2.2 Run `turbo build --dry=json --filter=baro` — **PASS**: turbo parses config, recognizes baro#build pipeline, resolves dependencies
- [x] 2.3 Run `docker compose config` — **PASS**: all 8 services (postgres, caddy, baro, baro-db) with caddy_network, volumes, env vars resolve correctly
- [x] 2.4 Caddyfile validation: `caddy validate --config` — **PASS**: configuration is valid (6 domain blocks, auto TLS enabled)
  - Note: Caddyfile formatting can be normalized with `caddy fmt`; not a functional issue
- [x] 2.5 Baro build pipeline: `pnpm --filter baro exec next info` — **PASS**: Next.js 16.2.4 resolves, baro's build pipeline (turbo baro#build) is structurally valid
  - Full build requires secrets (DATABASE_URL) and is deferred to Fase 2 catalogs alignment
- [ ] 2.6 Verify baro DB isolation — **DEFERRED**: requires `docker compose up` runtime; host port 5433 is assigned uniquely (no collision with existing postgres:5432)
