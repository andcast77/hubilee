# Proposal: Unified Docker Stack & Monorepo Structure

## Intent

Run **every app and the API via Docker Compose** on **one Postgres database** (`hubilee`), merge baro schema into `@hubilee/database`, and **unify baro auth** with hubilee `User` + `@hubilee/api` JWT/sessions. Align package naming (`@hubilee/baro`) and close infra drift.

## Scope

### In Scope
- **Baro DB merge** — domain models in `packages/database`; remove `apps/baro/prisma/`
- **Baro auth merge (Option B)** — drop baro `User`/`RefreshToken`; use hubilee `User`, `Session`, `@hubilee/api` auth endpoints; add `baro` module key + RBAC
- **Tenant scoping** — baro entities scoped by `companyId`; replace `accountOwnerId` with company/member context
- **Baro app refactor** — remove local auth routes/JWT; use `@hubilee/shared` auth + API client (pos/workify pattern)
- **Docker** — shared `postgres`, `@hubilee/api`, Caddy, 6 apps; remove `baro-db`; stack-level migrate
- Rename `baro` → `@hubilee/baro`
- Root scripts + `turbo.json` env; spec updates

### Out of Scope
- Balance API/schema/RBAC (separate SDD change)
- Kubernetes, Vercel deploy, production DNS/TLS
- Hub landing / cross-app URL wiring beyond env vars
- Baro data migration from production baro-db (document script; execute per environment)

## Capabilities

### New Capabilities
- `baro-data-model`: baro domain tables in `@hubilee/database` with `companyId` tenant scoping
- `baro-auth-integration`: baro app authenticates via `@hubilee/api`; no standalone baro auth tables

### Modified Capabilities
- `containerized-deployment`: single shared Postgres; API service; no per-app DB services
- `multi-domain-routing`: every Caddy upstream has a compose service

## Approach

### Auth merge (Option B — confirmed)
1. Remove baro `User`, `RefreshToken`; baro users become hubilee `User` + `CompanyMember`
2. Register `baro` in `Module` seed; gate baro API/routes with `requireModuleAccess('baro')`
3. Baro Next.js: delete `apps/baro/app/api/auth/*`, `lib/auth/jwt.ts`, local session; proxy `/v1/*` to API
4. Baro server actions/routes call `@hubilee/api` or shared DB via `@hubilee/database` with company context from JWT

### DB merge
1. Port Expediente, Professional, and related models to `packages/database` with `companyId` FK
2. Replace `accountOwnerId` → `companyId` (+ optional `createdById` → `User`)
3. Squash baro migrations into `packages/database/prisma/migrations/`
4. Baro app imports `@hubilee/database` only

### Infra
- Compose: `postgres`, `api`, `caddy`, 6 Next.js apps
- Migrate via `@hubilee/database` on api startup
- Thin Dockerfiles per app + `docker/Dockerfile.api`

## Affected Areas

| Area | Impact |
|------|--------|
| `packages/database/prisma/schema.prisma` | Baro models + `baro` module seed |
| `packages/api/` | Baro module routes (or baro data via existing patterns) |
| `packages/api/src/core/modules.ts` | Add `baro` to `MODULE_KEYS` |
| `apps/baro/**` | Remove local auth/prisma; API + shared auth |
| `apps/baro/prisma/` | **Removed** |
| `docker-compose.yml` | Full stack; no baro-db |
| `openspec/specs/` | New + modified specs |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Auth regression for existing baro users | High | Migration script: baro User → hubilee User + Company |
| Breaking expediente ownership model | Med | Map accountOwner → company owner membership |
| Large baro refactor scope | High | Phased tasks: schema → API → app auth removal |
| Data loss | Med | Backup before merge; idempotent migration |

## Rollback Plan

Git revert. Restore `baro-db` + local prisma/auth from archive. DB restore from backup. Re-enable baro standalone auth only if rollback before user migration.

## Dependencies

- `@hubilee/api` auth endpoints (login, refresh, register)
- `@hubilee/shared` auth cookie utilities
- Company registration flow for new baro tenants

## Success Criteria

- [ ] No baro auth tables; baro login uses API JWT
- [ ] Baro domain models in `@hubilee/database` with `companyId`
- [ ] `docker compose up --build -d` — postgres, api, caddy, 6 apps; no `baro-db`
- [ ] `@hubilee/baro` builds; login + expedientes CRUD work via API/shared DB
- [ ] `baro` module gating enforced; cross-company access denied

## Decision Log

- **Auth merge:** Option **B** — full integration with hubilee User + API auth (user confirmed)
