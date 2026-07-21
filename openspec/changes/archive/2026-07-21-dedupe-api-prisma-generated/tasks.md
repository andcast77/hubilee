# Tasks: Deduplicate API Prisma generated client

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~20–80 authored; ~128 generated files deleted (excluded from authored budget) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Canonical path only; delete legacy tree | PR 1 | `pnpm --filter @hubilee/api db:generate` + grep + typecheck | Seed import resolves after generate (or typecheck); no `apps/api/generated` refs | Revert seed, `.gitignore`, README, `turbo.json`; restore `apps/api/generated/**` from pre-change commit |

## Phase 1: Foundation — seed + gitignore

- [x] 1.1 In `apps/api/prisma/seed.ts`, change Prisma Client import to `../src/generated/prisma/client` (must land before delete)
- [x] 1.2 In `apps/api/.gitignore`, ignore package-root `/generated/` while keeping `src/generated/` ignore behavior intact

## Phase 2: Core — delete legacy tree + docs/turbo

- [x] 2.1 `git rm -r apps/api/generated/` (or equivalent) so package-root legacy Prisma Client is untracked and absent
- [x] 2.2 Update `apps/api/README.md`: document `apps/api` + local `prisma generate`; remove `packages/database` / `packages/api` paths for this flow
- [x] 2.3 In `turbo.json` build `outputs`, use `src/generated/**` and drop stale `generated/**`

## Phase 3: Verification (smoke; strict_tdd → no unit tests for deleted generated files)

- [x] 3.1 Run `pnpm --filter @hubilee/api db:generate`; confirm output under `apps/api/src/generated/prisma` only
- [x] 3.2 Grep repo: no leftover refs to `apps/api/generated` (and seed does not import package-root generated)
- [x] 3.3 Run `pnpm --filter @hubilee/api typecheck` (seed/runtime imports resolve to canonical tree)
