# Tasks: Baro Upstream Sync

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 800–2500 |
| 400-line budget risk | High |
| Chained PRs recommended | No |
| Suggested split | Single PR (sync batch) |
| Delivery strategy | exception-ok |
| Chain strategy | feature-branch-chain → v2 |

Decision needed before apply: No (user approved auto merge to v2)
Chained PRs recommended: No
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

1. SDD artifacts + baseline inventory
2. Upstream rsync with denylist + protected restore
3. API/service parity pass
4. Verify + merge to v2

## Phase 1: Baseline

- [x] 1.1 Record upstream `main` SHA in `upstream-baseline.md`
- [x] 1.2 Classify diff inventory (UI / action / schema / test / deny)
- [x] 1.3 Create branch `change/baro-upstream-sync` from `v2`

## Phase 2: App sync

- [x] 2.1 Rsync upstream → `apps/baro` with denylist excludes
- [x] 2.2 Restore protected paths (`lib/api/**`, package.json, Docker, API actions, session)
- [x] 2.3 Remove any denylisted paths if copied (`prisma/`, `app/api/auth/`, etc.)

## Phase 3: API / DB parity

- [x] 3.1 Compare upstream schema vs `Baro*` models; add migration if needed (none — `nomenclaturaAnulada` already present)
- [x] 3.2 Patch `baro.service.ts` / DTOs / contracts for `nomenclaturaAnulada`

## Phase 4: Verification

- [x] 4.1 `pnpm --filter @hubilee/baro test`
- [x] 4.2 API baro tenant-isolation tests
- [x] 4.3 Write `verify-report.md`

## Phase 5: Delivery

- [x] 5.1 Commit SDD + sync on feature branch
- [x] 5.2 PR + merge to `v2`
- [ ] 5.3 Pause before `sdd-archive` for user confirmation
