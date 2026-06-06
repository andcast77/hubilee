# Tasks: Unified Docker Stack & Baro Integration

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 2500–4500 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 schema → PR2 API → PR3 baro app → PR4 Docker |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-v2 |
| Base / target branch | **`v2` only** — never `master` |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-v2
400-line budget risk: High

### Git / PR policy (confirmed)

- **Source branch:** `v2` (or feature branches cut from `v2`)
- **Merge target:** `v2` for every PR in the chain — **not `master`**
- **Flow:** PR1 → merge `v2` → PR2 (rebase on updated `v2`) → merge `v2` → … until PR4 merged into `v2`
- **Tracker (optional):** `feature/check-structure` from `v2`; child PRs target previous PR branch or `v2` after each merge

### Suggested Work Units

| Unit | Goal | Merge into | Notes |
|------|------|------------|-------|
| 1 | DB schema + seed + legacy migration script | `v2` | No app breakage yet |
| 2 | `/v1/baro/*` API + tests (strict TDD) | `v2` | After PR1 on `v2` |
| 3 | Baro app: API client, Hub register, drop local auth/prisma | `v2` | After PR2 on `v2` |
| 4 | Docker full stack + CORS + `@multisystem/baro` rename | `v2` | Final slice on `v2` |

## Phase 1: Database & RBAC Foundation

- [x] 1.1 Add baro enums/models to `packages/database/prisma/schema.prisma` (`companyId`, `@@map("baro_*")`; no baro User/RefreshToken)
- [x] 1.2 Create migration via `pnpm migrate:dev` in `@multisystem/database`
- [x] 1.3 Add `baro` module + permissions in `packages/database/prisma/seed.ts`; wire sample company
- [x] 1.4 Add `baro` to `MODULE_KEYS` / `CompanyModulesShape` in `packages/api/src/core/modules.ts`
- [x] 1.5 Create `packages/database/scripts/migrate-baro-legacy.ts` — baro user → User+Company+CompanyMember+FK rewrite (dry-run flag)
- [x] 1.6 Archive `apps/baro/prisma/migrations/` under `packages/database/prisma/migrations_legacy_baro/` (reference only)

## Phase 2: API Module (`/v1/baro/*`)

- [x] 2.1 **RED** — integration tests: module disabled 403, cross-company 403 (`packages/api/src/__tests__/integration/baro.*.test.ts`)
- [x] 2.2 Create `packages/contracts/src/baro.ts` + export from `index.ts`
- [x] 2.3 Create `packages/api/src/dto/baro.dto.ts` (Zod) from baro schemas
- [x] 2.4 Create `packages/api/src/services/baro.service.ts` — port logic from `apps/baro/lib/expediente/**` + professionals; all queries filter `companyId`
- [x] 2.5 Create `packages/api/src/controllers/v1/baro.controller.ts`; register in `controllers/v1/index.ts`
- [x] 2.6 **GREEN** — make integration tests pass; add unit tests for validation/tenant edge cases

## Phase 3: Baro App Integration

- [x] 3.1 Rename package to `@multisystem/baro` in `apps/baro/package.json`; set dev port **3006** (avoid API :3000 clash)
- [x] 3.2 Create `apps/baro/lib/api/client.ts` (`authApi`, `baroApi` via `@multisystem/shared` ApiClient)
- [x] 3.3 Replace login with API auth; register links to Hub (`NEXT_PUBLIC_HUB_URL/register` or existing Hub route)
- [x] 3.4 Delete `apps/baro/app/api/auth/**`, `apps/baro/lib/auth/**`, `apps/baro/lib/prisma.ts`, `apps/baro/prisma/**`
- [x] 3.5 Refactor pages/actions: remove direct Prisma; call `baroApi` (keep DOCX render local, fetch payload via API)
- [x] 3.6 Update `apps/baro/next.config.ts`: `turbopack.root`, dev rewrites optional; add `@multisystem/shared`, `@multisystem/contracts` deps

## Phase 4: Docker, CORS & Monorepo Wiring

- [x] 4.1 Extend `CORS_ORIGIN` in `packages/api/.env.example`, `packages/api/.env`, compose API env: localhost **3000,3001–3006** + `https://*.multisystem.app` domains
- [x] 4.2 Create `docker/Dockerfile.api`; thin `apps/{hub,shopflow,workify,techservices,balance,baro}/Dockerfile` from `docker/Dockerfile.nextjs`
- [x] 4.3 Rewrite `docker-compose.yml`: `postgres`, `api`, `caddy`, 6 apps; **remove `baro-db`** / `baro_pgdata`
- [x] 4.4 Simplify `apps/baro/docker-entrypoint.sh` — no prisma migrate
- [x] 4.5 Add root scripts + `turbo.json` globalEnv (`NEXT_PUBLIC_BALANCE_URL`, `dev:balance`, `dev:baro`, etc.)
- [x] 4.6 Update `apps/baro/.env.example` — drop baro DB/JWT; add `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_HUB_URL`

## Phase 5: Verification

- [x] 5.1 `pnpm typecheck` + `pnpm test` (API baro tests)
- [ ] 5.2 `docker compose config` passes; `docker compose up --build -d` — all services up; Caddy no 502 on 6 domains
- [ ] 5.3 Manual: Hub register → enable baro → login on baro → expediente CRUD
- [x] 5.4 Run `sdd-verify` against spec scenarios; write `verify-report.md`
