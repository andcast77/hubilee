# Proposal: Baro Upstream Sync (andcast77/baro main)

## Intent

Bring `apps/baro` up to date with upstream product code on **`main`** (`https://github.com/andcast77/baro`) while **preserving monorepo integration** from `check-structure` (API auth, shared `@hubilee/database`, tenant scoping). Close UI/test/feature drift without reverting to standalone Prisma/JWT.

## Scope

### In Scope
- Add git remote `baro-upstream`; baseline mapping to monorepo integration point
- Selective merge/patch of upstream `main` into `apps/baro` with explicit **denylist** (no `prisma/**`, `app/api/auth/**`, `lib/prisma.ts`, standalone JWT/crypto, upstream Docker/PM2)
- Port UI, stores, locales, DOCX, and tests; adapt server actions to `lib/api/server.ts`
- Port upstream schema deltas to `packages/database` `Baro*` models + migration when needed
- Extend `/v1/baro/*` service/DTO/contracts when upstream adds fields or mutations
- Document recurring sync procedure in spec

### Out of Scope
- Full tree replace or abandoning API-centralized architecture
- Upstream feature branches (`feat/nueva-mensura`, `feat/professional-selection-ui-redesign`, etc.)
- Standalone baro deployment (`compose.yaml`, `ecosystem.config.cjs`)
- Production legacy DB cutover (existing migration script only updated if schema changes)

## Capabilities

### New Capabilities
- `baro-upstream-sync`: rules and workflow for syncing upstream `main` into integrated `apps/baro` without breaking auth/data-model specs

### Modified Capabilities
- None (implementation sync only; `baro-auth-integration` and `baro-data-model` invariants unchanged)

## Approach

Phased selective three-way sync:

1. **Inventory** — diff upstream `main` vs `apps/baro`; classify changes (UI, action, schema, test, deny)
2. **App sync** — merge UI/store/test files; on conflict: keep `lib/api/**`, reject prisma/auth imports; rewire actions to `serverBaro*`
3. **API/DB sync** — mirror upstream Prisma/logic changes in `baro.service.ts`, DTOs, contracts, migrations
4. **Verify** — baro Vitest, API `baro-tenant-isolation`, typecheck; manual expediente smoke

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/baro/**` | Modified | Upstream UI/tests/features |
| `apps/baro/lib/api/**` | Preserved | Integration layer; never overwritten |
| `packages/api/src/services/baro.service.ts` | Modified | Logic parity with upstream mutations |
| `packages/api/src/dto/baro.dto.ts`, `packages/contracts/src/baro.ts` | Modified | New/changed fields |
| `packages/database/prisma/**` | Modified | Baro schema migrations if upstream changed |
| `openspec/specs/baro-upstream-sync/` | New | Sync process spec |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Auth/prisma regression | High | Denylist + spec gates; no merge of upstream auth paths |
| Silent API logic drift | Med | Compare upstream `update-all`/actions vs service methods |
| Merge conflict volume (~173 files) | Med | Conflict playbook by category |
| Test failures after port | Med | Fix mocks; run CI suite per phase |

## Rollback Plan

Revert sync commits on branch. If DB migration applied, add down migration or restore from backup. `lib/api/**` and canonical specs remain source of truth for integration shape.

## Dependencies

- Upstream remote access to `andcast77/baro` `main`
- Existing `/v1/baro/*` surface and `check-structure` artifacts
- Vitest + API integration test infra

## Success Criteria

- [ ] Upstream `main` product delta (post-integration baseline) applied to `apps/baro` without local Prisma/auth
- [ ] `pnpm --filter @hubilee/baro test` and API baro integration tests pass
- [ ] No violations of `baro-auth-integration` or `baro-data-model` specs
- [ ] `baro-upstream-sync` spec documents denylist and sync workflow for future runs
