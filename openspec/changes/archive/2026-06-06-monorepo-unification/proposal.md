# Proposal: Monorepo Unification

## Intent

Absorb the standalone `baro` Next.js app into the `@multisystem/*` Turborepo monorepo, eliminating a second codebase while minimizing disruption. Deliver unified Docker + Vercel deployment, a Caddy reverse proxy for per-domain routing, and a progressive unification roadmap across 3 phases.

## Scope

### In Scope
- Move `baro/` to `apps/baro/` with path alias rewriting (`@/*` → `@multisystem/baro/*`)
- Caddy reverse proxy with per-app domain routing (`*.multisystem.app`)
- Docker Compose with all apps + Postgres per service + Caddy
- Separate Prisma schema (Fase 1), separate auth (Fase 1)
- pnpm catalog merge with version bumps (TS 6.0.2, Next 16.2.4, Prisma 7.8)
- Keep `@multisystem/*` namespace convention for baro

### Out of Scope
- Auth unification (deferred to Fase 3+)
- Shared Prisma schema (deferred to Fase 3+)
- Flat domain routing (no path-based routing; each app keeps its own subdomain)
- Kubernetes or other orchestrators

## Capabilities

### New Capabilities
- `multi-domain-routing`: Caddy reverse proxy configuration routing domains to each app container
- `containerized-deployment`: Dockerfile per app, docker-compose.yml with all services + proxy + databases

### Modified Capabilities
- None — existing capabilities (`auth-company-registration-otp`) are not affected at the spec level

## Approach

**Enfoque D: Caddy + Docker Compose + Unificación Progresiva.**

| Fase | Scope | Key Actions |
|------|-------|-------------|
| 1 (infra) | Move baro, infra | Move to `apps/baro/`, Dockerfiles, Caddy, docker-compose. Keep Prisma + auth separate. |
| 2 (catalogs) | Version alignment | Merge pnpm catalogs: TS 6.0.2, Next 16.2.4, Prisma 7.8. Root typecheck passes. |
| 3+ (opt-in) | Share packages | Progressively consume `@multisystem/ui`, `@multisystem/api`, etc. Evaluate auth unification. |

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/baro/` | New | Moved from standalone repo, path alias rewrite |
| `docker-compose.yml` | Modified | Add baro service, Caddy, per-app Postgres |
| `Dockerfile.baro` | New | Dockerfile for baro app |
| `Caddyfile` | New | Reverse proxy routing per domain |
| `pnpm-workspace.yaml` | Modified | Add `apps/baro` to workspace |
| `catalog` (pnpm) | Modified | Version bumps for TS, Next, Prisma |
| `turbo.json` | Modified | Add baro pipeline config |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Path alias conflicts (`@/*` in baro vs root) | High | Rewrite to `@multisystem/baro/*` before move |
| Docker port collisions (baro Postgres:5433) | Med | Map external ports uniquely; internal DNS resolves |
| Deploy regression during coexistence | Med | Fase 1 preserves Vercel deploys; new Docker path is additive |

## Rollback Plan

Per Fase: revert the specific changes — remove `apps/baro/`, restore `docker-compose.yml`, `pnpm-workspace.yaml`, and `turbo.json` from git. Caddy is purely additive (no existing infra affected). Catalog version bumps in Fase 2 can be reverted per commit.

## Dependencies

- Caddy v2 binary or Docker image
- pnpm 10 (already present)
- DNS entries for baro domain pointing to Docker host

## Success Criteria

- [ ] `apps/baro/` serves at `baro.multisystem.app` via Caddy, identical behavior to standalone
- [ ] All 6 apps (5 existing + baro) run in `docker compose up`
- [ ] Root `pnpm typecheck` passes across all apps
- [ ] Fase 1 requires zero changes to existing app code
