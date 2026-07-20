# Tasks: Turborepo Conventions Realignment

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 600–1200 (excluding git mv renames) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 (Slice A) → PR2 (Slice B) → PR3 (Slice C) |
| Delivery strategy | ask-on-risk |
| Chain strategy | merge-to-v2-per-slice (each PR verifies → merges to `v2`; next PR branches from `v2`) |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Base branch |
|------|------|-----------|-------------|
| 1 | Workspace + CI (Slice A) | PR1 | `v2` → merge back to `v2` |
| 2 | Layout moves (Slice B) | PR2 | `v2` → merge back to `v2` |
| 3 | Docker/Vercel (Slice C) | PR3 | `v2` → merge back to `v2` |

## Phase 1: Slice A — Workspace & CI

- [x] 1.1 Add `packages/shared/tsconfig.build.json`; update `package.json` exports to `dist/`
- [x] 1.2 Add `build`/`typecheck` scripts to `@hubilee/shared`; verify `pnpm turbo run build --filter=@hubilee/shared`
- [x] 1.3 Update root `package.json`: `--filter=<pkg>...` on dev/build scripts; remove `api:bundle` and `vercel:build`
- [x] 1.4 Update `turbo.json`: remove `@hubilee/baro#*` overrides; add `NEXT_PUBLIC_*` to `build.env`
- [x] 1.5 Remove nested `packageManager` from `apps/baro/package.json`
- [x] 1.6 Update `.github/workflows/ci.yml`: `fetch-depth: 0`, branches `v2`/`main`, `turbo run … --affected`
- [x] 1.7 Run `pnpm turbo run build --filter=@hubilee/hub...` — must pass (spec: shared builds first)

## Phase 2: Slice B — Layout

- [x] 2.1 `git mv packages/api apps/api`
- [x] 2.2 `git mv packages/component-library packages/ui`
- [x] 2.3 Update Tailwind `@source` / `tailwind.config.js` paths to `packages/ui` in hub, shopflow, workify, techservices, balance
- [x] 2.4 Update `.cursor/rules/*.mdc` globs: `apps/api/src/**`, `packages/ui/src/**`
- [x] 2.5 Update `scripts/vercel-api-skip-if-unchanged.sh` to watch `apps/api`
- [x] 2.6 Grep-fix remaining `packages/api` / `component-library` path references in code/scripts
- [x] 2.7 Run `pnpm turbo run typecheck --filter=@hubilee/api...` — must pass

## Phase 3: Slice C — Docker & Vercel

- [x] 3.1 Rewrite `docker/Dockerfile.nextjs`: `turbo prune`, builder ENV for `NEXT_PUBLIC_*`, standalone runner `node apps/${APP_DIR}/server.js`
- [x] 3.2 Rewrite `docker/Dockerfile.api`: `turbo prune @hubilee/api`; CMD `node apps/api/dist/server.js`
- [x] 3.3 Update `docker-compose.yml`: all Next services use `docker/Dockerfile.nextjs` + build-args (`PACKAGE`, `APP_DIR`, `PORT`, `NEXT_PUBLIC_*`)
- [x] 3.4 Delete `apps/{hub,shopflow,workify,techservices,balance,baro}/Dockerfile` and `apps/baro/docker-entrypoint.sh`
- [x] 3.5 Add `output: 'standalone'` + `outputFileTracingRoot` to hub, shopflow, workify, techservices, baro `next.config.ts`
- [x] 3.6 Update `apps/*/vercel.json` and `apps/api/vercel.json`: root install + `turbo run build --filter=…...`
- [x] 3.7 Update `.env.example` with Docker build-time `NEXT_PUBLIC_*` notes; clean stale `.dockerignore` entries
- [x] 3.8 `docker build -f docker/Dockerfile.nextjs` (hub args) — container starts without `next: not found`
- [x] 3.9 `docker build -f docker/Dockerfile.api` — migrations + API serve

## Phase 4: Verification (`sdd-verify`)

Per-PR verify (run at end of each slice before merge to `v2`). Full cross-slice scenarios marked N/A until later slices land.

### PR1 — Slice A verify

- [x] 4A.1 Spec: shared builds to `dist/` before hub (`--filter=@hubilee/hub...`)
- [x] 4A.2 Spec: root `build` delegates to `turbo run build`
- [x] 4A.3 Spec: dev/build scripts use `--filter=<pkg>...` closure
- [x] 4A.4 Spec: no `@hubilee/baro#*` overrides in `turbo.json`
- [x] 4A.5 Spec: CI `--affected` + `fetch-depth: 0` + branches `v2`/`main`
- [x] 4A.6 Run `pnpm turbo run lint typecheck test build --filter=@hubilee/hub...` (or `--affected` vs `v2`)
- [x] 4A.7 Write `verify-report-pr1.md`; merge PR1 → `v2`

### PR2 — Slice B verify

- [x] 4B.1 Spec: API at `apps/api/` (layout scenario)
- [x] 4B.2 Spec: UI at `packages/ui/`
- [x] 4B.3 Run `pnpm turbo run typecheck --filter=@hubilee/api...`
- [x] 4B.4 Run `pnpm turbo run lint typecheck test build --affected` vs `v2`
- [x] 4B.5 Write `verify-report-pr2.md`; merge PR2 → `v2`

### PR3 — Slice C verify

- [x] 4C.1 Spec: `turbo prune` in Docker build logs (containerized-deployment)
- [x] 4C.2 Spec: hub image runs `node apps/hub/server.js` (standalone scenario)
- [x] 4C.3 Spec: API Vercel build via `turbo run build --filter=@hubilee/api...`
- [x] 4C.4 `docker build` hub + API images pass
- [x] 4C.5 Run `pnpm turbo run lint typecheck test build --affected` vs `v2`
- [x] 4C.6 Write `verify-report-pr3.md`; merge PR3 → `v2`

### Final (before archive — user confirmation required)

- [x] 4F.1 Consolidate `verify-report.md` from PR1–PR3
- [x] 4F.2 `sdd-archive` — **ask user before executing**

## Phase 5: Delivery

- [x] 5.1 Create plan branch from `v2` per git-plan-workflow
- [x] 5.2 Each slice: verify → fix → merge to `v2` automatically; next slice branches from updated `v2`
- [x] 5.3 `sdd-archive` after all slices + final verify — **notify user before archive**
