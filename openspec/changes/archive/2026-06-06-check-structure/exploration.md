## Exploration: check structure

### Current State

The hubilee monorepo is a pnpm + Turborepo workspace with **6 Next.js apps** (`hub`, `shopflow`, `workify`, `techservices`, `balance`, `baro`) and **shared packages** (`api`, `database`, `contracts`, `shared`, `ui`). Most product apps follow the `@hubilee/{app}` naming convention, extend `tsconfig.base.json`, use catalog deps, and talk to the shared Fastify API on port 3000.

**Monorepo-unification (Fase 1, archived 2026-06-06)** delivered Caddy routing, a generic `docker/Dockerfile.nextjs`, and a baro-specific Docker stack. Canonical specs now live under `openspec/specs/` for `containerized-deployment` and `multi-domain-routing`.

**In parallel, Balance work is in progress (untracked WIP):**
- `apps/balance/` — scaffold Next.js app (port 3005), builds successfully
- `packages/api/src/{controllers,services,dto}/balance.*` — full REST surface drafted
- `packages/contracts/src/balance.ts` — DTO types defined

**Structural drift:** routing/infra artifacts assume 6 apps, but Docker Compose only runs baro + shared postgres + caddy. Balance API code references Prisma models that do not exist, is not registered in the API router, and the `balance` module key is absent from RBAC/module gating.

### Affected Areas

- `docker-compose.yml` — only 4 services; missing 5 app containers despite Caddyfile expecting 6 upstreams
- `Caddyfile` — 6 domain blocks; 5 upstreams have no compose service (502 at runtime)
- `docker/Dockerfile.nextjs` — generic pattern exists but only `apps/baro/Dockerfile` is wired
- `apps/balance/` — new app scaffold; not integrated into root scripts, turbo env, or Docker
- `apps/baro/package.json` — package name `baro` (not `@hubilee/baro`); separate Prisma/auth from shared stack
- `packages/api/src/controllers/v1/index.ts` — balance routes not registered
- `packages/api/src/core/modules.ts` — `MODULE_KEYS` lacks `balance`; `requireModuleAccess('balance')` would fail type/runtime checks
- `packages/database/prisma/schema.prisma` — no Account/CostCenter/JournalEntry/FiscalYear models
- `packages/contracts/src/index.ts` — does not re-export `balance.ts`
- `package.json` (root) — no `dev:balance` / `build:balance`; no `NEXT_PUBLIC_BALANCE_URL` in turbo globalEnv
- `turbo.json` — baro-specific pipeline overrides only; no balance entries
- `openspec/specs/containerized-deployment/spec.md` — requires per-app Dockerfile + full stack; partially met

### Approaches

1. **Audit-first, phased remediation (recommended)** — Document gaps, then fix in dependency order: Prisma schema → module seed/RBAC → API registration → contracts export → frontend wiring → Docker/Caddy completion.
   - Pros: Respects SDD; avoids shipping broken API; aligns with archived monorepo-unification phasing
   - Cons: Slower to “full stack in Docker”
   - Effort: Medium

2. **Complete Docker stack first** — Add compose services + Dockerfiles for all 6 apps using `docker/Dockerfile.nextjs`, defer Balance API/DB.
   - Pros: Satisfies containerized-deployment spec quickly; unblocks local multi-domain testing
   - Cons: Balance API remains broken; Caddy 502 for balance until app container exists; does not fix API layer gaps
   - Effort: Medium

3. **Balance-vertical slice** — Finish Balance end-to-end (schema, API, module, app UI) on shared postgres; defer multi-app Docker expansion.
   - Pros: Delivers product value; uses existing shared DB pattern (unlike baro's isolated DB)
   - Cons: Leaves infra spec non-compliant; Caddy balance block still 502 in Docker
   - Effort: High

### Recommendation

**Approach 1 (audit-first, phased remediation)** with two tracks:

| Track | Scope | Priority |
|-------|-------|----------|
| **A — Balance product** | Prisma models + migration, module key in seed/RBAC, register routes, export contracts, wire frontend, tests per strict_tdd | High (WIP code is currently non-functional) |
| **B — Infra parity** | Compose services for hub/shopflow/workify/techservices/balance using generic Dockerfile; align baro naming over time | Medium (spec debt from Fase 1) |

Do **not** merge Balance API files until schema + route registration + module gating are complete — current files would fail typecheck/build against `@hubilee/database`.

### Risks

- **Broken API if merged as-is** — balance.service.ts references non-existent Prisma models; controller uses invalid module key
- **Caddy 502 for 5/6 domains** — compose stack incomplete vs Caddyfile
- **Naming inconsistency** — `baro` vs `@hubilee/*` complicates `pnpm --filter` and generic Docker ARG
- **Dual-database confusion** — baro has isolated Prisma/Postgres; Balance correctly targets shared `@hubilee/database` but models missing
- **Spec vs reality gap** — archived verify-report marked PASS but proposal success criterion “all 6 apps in docker compose up” is unmet
- **No tests** — strict_tdd requires tests before Balance API ships

### Ready for Proposal

**Yes**, with scope clarification needed from the user:

1. Is the primary goal **infra structure audit** (Docker/Caddy/compose parity) or **Balance module completion** (API + app)?
2. Should Balance use **shared postgres** (like other product apps) — recommended given existing service code — or a dedicated DB (baro pattern)?
3. Should baro naming (`baro` → `@hubilee/baro`) be in scope for this change or a follow-up?

Once confirmed, proceed to `sdd-propose` with change name `check-structure` (or split into `balance-module` + `docker-stack-completion` if scope is too broad).
