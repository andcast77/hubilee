# Verify Report: Baro Upstream Sync

**Change**: `baro-upstream-sync`  
**Date**: 2026-06-06  
**Upstream**: `andcast77/baro` @ `13ee779` (`main`)

## Spec Scenarios

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Upstream source `main` | PASS | `upstream-baseline.md` records SHA `13ee779` |
| Integration denylist | PASS | No `apps/baro/prisma/`, no `app/api/auth/`; grep shows no `@/lib/prisma` in app |
| API layer preserved | PASS | `lib/api/**` intact; pages/routes use `serverBaroGetData` |
| Schema/API parity | PASS | `nomenclaturaAnulada` wired schema → API → UI |
| Pre-ship verification | PASS | Baro + API tests green (see below) |
| Sync inventory | PASS | `upstream-baseline.md` |

## Automated Tests

| Suite | Result |
|-------|--------|
| `pnpm --filter @hubilee/baro test` | **144 passed**, 1 skipped |
| `pnpm --filter @hubilee/api test -- baro-tenant-isolation` | **349 passed** (full API suite ran) |

## Manual / Deferred

| Check | Status |
|-------|--------|
| Full `docker compose up --build` smoke | Not run (out of scope for sync PR) |
| Manual expediente E2E in browser | Not run |

## Canonical Spec Compliance

- `baro-auth-integration`: PASS — no local auth/prisma reintroduced
- `baro-data-model`: PASS — migrations unchanged; field already in `BaroExpediente`

## Verdict

**PASS** — upstream `main` product delta synced into integrated `apps/baro` with denylist enforced and tests green.
