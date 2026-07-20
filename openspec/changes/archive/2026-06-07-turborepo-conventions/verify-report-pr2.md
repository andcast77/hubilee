# Verify Report: Turborepo Conventions — PR2 (Slice B)

**Change**: `turborepo-conventions`  
**Slice**: B — Layout moves  
**Date**: 2026-06-07  
**Branch**: `plan/turborepo-conventions-slice-b` → merge to `v2`

## Spec Scenarios (turborepo-workspace-conventions)

| Requirement | Status | Evidence |
|-------------|--------|----------|
| API at `apps/api/` | PASS | `git mv packages/api → apps/api`; `@hubilee/api` builds from `apps/api` |
| UI at `packages/ui/` | PASS | `git mv packages/component-library → packages/ui` |
| Tailwind `@source` / content paths | PASS | hub, pos, workify, techservices updated to `packages/ui` |
| Shared builds before apps | PASS | (from PR1; hub build still passes) |

## Automated Tests

| Suite | Result |
|-------|--------|
| `pnpm turbo run build --filter=@hubilee/api...` | **PASS** |
| `pnpm turbo run build --filter=@hubilee/hub...` | **PASS** |
| `pnpm turbo run test --filter=@hubilee/api...` | **SKIP locally** — no `DATABASE_URL` in env (CI provides Postgres) |

## Path Updates

- `.cursor/rules/*.mdc` globs → `apps/api`, `packages/ui`
- `scripts/vercel-api-skip-if-unchanged.sh` watches `apps/api`
- Runtime/docs strings in API updated from `packages/api` → `apps/api`

## Verdict

**PASS** — Slice B ready to merge to `v2`.
