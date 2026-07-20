## Exploration: Baro migration from upstream (andcast77/baro)

### Current State

**Upstream repository** (`https://github.com/andcast77/baro`):
- Default branch is **`main`** (commit `13ee779`, "Webadas"). There is **no `master` branch**.
- Other remote branches: `Migration`, `feat/nueva-mensura`, `feat/professional-selection-ui-redesign`, `feat/registro-de-profesionales`, `fix/*`, `test`.
- Standalone Next.js app (`name: "baro"`, dev port 3000) with **local Prisma** (`prisma/`, `@prisma/client`), **local JWT auth** (`app/api/auth/**`, `lib/auth/**`), and server actions that read/write via `lib/prisma.ts`.
- ~184 TS/TSX source files; build runs `prisma migrate deploy && prisma generate && next build`.

**Monorepo `apps/baro` (post `check-structure`, branch `v2`)**:
- Integrated product app (`@hubilee/baro`, port **3006**); **no local Prisma or auth routes**.
- Data access via `lib/api/client.ts` + `lib/api/server.ts` → `@hubilee/api` `/v1/baro/*` and `/v1/auth/*`.
- Baro domain models live in `packages/database/prisma/schema.prisma` (`Baro*` models with `companyId`, `@@map("baro_*")`).
- Canonical constraints in `openspec/specs/baro-data-model/` and `openspec/specs/baro-auth-integration/` (API cookies, no standalone auth tables).
- Server actions consolidated: `update-all`, `nueva`, `delete` call API; upstream granular actions (`colindantes.ts`, `datos-generales.ts`, `publicacion-acta.ts`, `titulo-relacion.ts`) were removed in favor of `PUT /expedientes/:id/full`.
- ~162 TS/TSX files; monorepo-only additions: `lib/api/**`, `Dockerfile`, `docker-entrypoint.sh`, `lib/expediente/docx/fetch-render-row.ts`.

**Divergence snapshot** (upstream `main` vs `apps/baro`, excluding build artifacts):
- **173 files differ** in content.
- **~30 paths exist only upstream** (local auth, prisma, granular actions, standalone infra docs).
- **5 paths exist only in monorepo** (`lib/api/**`, Docker files, `fetch-render-row.ts`).
- Recent upstream delta since `Migration` merge point (`04faab6..13ee779`): **59 files**, +3982/−698 lines — mostly UI (expediente panels, date-picker, under-construction page), tests, and `esPropietario` on ordenantes. The schema field is **already present** in monorepo (`BaroExpedienteOrdenante.esPropietario` + API DTOs).

**Interpretation:** Initial monorepo integration (`check-structure`) already ported the baro codebase and rewired persistence/auth. The user request implies **ongoing sync** from upstream `main`, not a greenfield import. A naive copy from upstream would **revert** API integration and violate canonical specs.

### Affected Areas

- `apps/baro/**` — all UI, server actions, stores, DOCX render paths; must absorb upstream product changes while keeping API client layer.
- `apps/baro/lib/api/**` — monorepo-only; must be preserved; upstream changes touching auth/session must be adapted here.
- `packages/api/src/services/baro.service.ts` — business logic port of upstream Prisma mutations; upstream schema/action changes may require API updates.
- `packages/api/src/controllers/v1/baro.controller.ts`, `packages/api/src/dto/baro.dto.ts` — HTTP contract layer.
- `packages/contracts/src/baro.ts` — shared types between API and app.
- `packages/database/prisma/schema.prisma` + migrations — upstream standalone schema changes must be translated to `Baro*` models with `companyId`.
- `packages/database/scripts/migrate-baro-legacy.ts` — if upstream schema diverges from legacy baro DB.
- `openspec/specs/baro-data-model/`, `openspec/specs/baro-auth-integration/` — non-negotiable integration constraints.
- `docker-compose.yml`, `apps/baro/Dockerfile` — monorepo deployment; exclude upstream `compose.yaml`, `ecosystem.config.cjs`.
- Upstream-only (exclude from copy): `prisma/**`, `app/api/auth/**`, `lib/prisma.ts`, `lib/auth/jwt.ts`, `lib/auth/crypto.ts`, granular `lib/expediente/actions/{colindantes,datos-generales,...}.ts`.

### Approaches

1. **Full replace from upstream `main`** — Delete `apps/baro` and copy upstream tree wholesale, then re-apply integration.
   - Pros: Guaranteed parity with upstream file tree; simple mental model.
   - Cons: Reintroduces local Prisma/auth; breaks `check-structure` specs; high regression risk; must redo all API wiring manually.
   - Effort: High

2. **Selective three-way sync (recommended)** — Add upstream as git remote/subtree; merge or cherry-pick `main` into `apps/baro` with an explicit **denylist** (prisma, auth routes, standalone infra) and **adapter rules** (server actions → `serverBaro*` calls; session → `getSessionUserId` from adapted session module).
   - Pros: Preserves monorepo architecture; brings UI/tests/features forward incrementally; aligns with SDD and existing specs.
   - Cons: Merge conflicts on ~173 files; requires manual resolution per conflict class; ongoing discipline needed.
   - Effort: Medium–High (initial sync), Medium (recurring)

3. **Git subtree mirror with adapter directory** — Track upstream under `apps/baro-upstream/` via subtree; maintain thin `apps/baro` wrapper that imports/re-exports adapted modules.
   - Pros: Clear separation of upstream vs integration; easier diff visibility.
   - Cons: Duplicate tree maintenance; import path churn; unconventional for this monorepo.
   - Effort: High

4. **Feature-branch cherry-pick only** — Sync specific upstream branches (e.g. `feat/nueva-mensura`) instead of full `main`.
   - Pros: Smaller, scoped deliveries.
   - Cons: Misses `main` fixes; branch may still assume local Prisma; not a complete "migration from master/main".
   - Effort: Low–Medium per branch

### Recommendation

**Approach 2 — selective three-way sync from upstream `main`** (treat user "master" as **`main`** unless they specify another branch).

Suggested workflow:
1. Add remote `baro-upstream` → `https://github.com/andcast77/baro.git`.
2. Establish baseline commit mapping (monorepo integration point ≈ upstream pre-`Webadas` / `Migration`-era).
3. Merge or patch-apply upstream `main` into `apps/baro` with denylist and resolve conflicts in categories: (a) keep `lib/api/**`, (b) drop prisma/auth copies, (c) port UI/store/schema/test changes, (d) rewire touched server actions to API.
4. For any upstream Prisma migration, port to `packages/database` as a new migration on `Baro*` tables.
5. Extend API/service/DTOs when upstream adds fields or mutations not covered by `/v1/baro/*`.
6. Run baro unit tests + API integration tests (`baro-tenant-isolation`) + manual expediente E2E.

Do **not** use Approach 1 unless the user explicitly wants to abandon API-centralized architecture.

### Risks

- **Spec regression** — Re-merging upstream auth/prisma paths violates `baro-auth-integration` and reintroduces tenant isolation gaps.
- **Silent logic drift** — Upstream `update-all.ts` (~400 lines, direct Prisma) vs monorepo thin API wrapper (~50 lines); upstream changes may not apply cleanly without API parity checks.
- **Branch ambiguity** — User said `master` but repo uses `main`; `Migration` and `feat/*` branches may contain work not on `main`.
- **Schema mismatch** — Upstream standalone `schema.prisma` (285 lines) vs embedded `Baro*` models; field renames or new relations need coordinated API + migration.
- **Test gap** — Upstream added tests (e.g. `schemas.test.ts`, DOCX layout tests) that may fail until API mocks or integration fixtures match monorepo patterns.
- **Feature branches not on `main`** — `feat/nueva-mensura`, `feat/professional-selection-ui-redesign` require separate scope decision.

### Ready for Proposal

**Yes**, with clarifications for the user before `sdd-propose`:

1. Confirm source branch: **`main`** (not `master`) — or specify `Migration` / a `feat/*` branch.
2. Confirm intent: **sync latest upstream product code into integrated monorepo baro** (not replace integration with standalone app).
3. Scope: full `main` sync now vs phased (UI/tests first, then API/schema deltas).
4. Whether open upstream feature branches should be included in scope.

Proceed to **`sdd-propose`** with change name **`baro-upstream-sync`** once confirmed.
