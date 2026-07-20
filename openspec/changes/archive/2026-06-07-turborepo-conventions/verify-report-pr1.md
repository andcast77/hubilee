# Verify Report: Turborepo Conventions — PR1 (Slice A)

**Change**: `turborepo-conventions`  
**Slice**: A — Workspace & CI  
**Date**: 2026-06-07  
**Branch**: `plan/turborepo-conventions` → merge to `v2`

## Spec Scenarios (turborepo-workspace-conventions)

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Shared builds to `dist/` before apps | PASS | `pnpm turbo run build --filter=@hubilee/hub...` — shared builds first, hub succeeds |
| Root `build` delegates to Turbo | PASS | Root `package.json`: `"build": "turbo run build"` |
| Filter closure for dev/build | PASS | e.g. `dev:hub` → `turbo run dev --filter=@hubilee/hub...` |
| No baro-only build override | PASS | No `@hubilee/baro#*` in `turbo.json` |
| CI affected runs | PASS | `.github/workflows/ci.yml`: `fetch-depth: 0`, branches `v2`/`main`, `turbo run … --affected` |
| API at `apps/api/` | N/A | Slice B |
| UI at `packages/ui/` | N/A | Slice B |
| Vercel build via Turbo graph | N/A | Slice C |

## Automated Tests

| Suite | Result |
|-------|--------|
| `pnpm turbo run lint typecheck test build --filter=@hubilee/hub...` | **PASS** (7 tasks) |

## Verdict

**PASS** — Slice A ready to merge to `v2`.
