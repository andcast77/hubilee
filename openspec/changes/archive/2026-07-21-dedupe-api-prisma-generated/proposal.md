# Proposal: Deduplicate API Prisma generated client

## Intent

After folding `@hubilee/database` into `@hubilee/api`, the canonical Prisma Client is at `apps/api/src/generated/prisma`, but a **stale tracked tree** remains at `apps/api/generated/`. Seed still imports that legacy path; README/gitignore still reflect the old layout — confusing developers and keeping ~7MB of obsolete generated code.

## Assumptions (question round skipped)

User approved surgical cleanup (“Si pero con sdd”):

1. **Problem**: confusion + stale tracked client after database→api merge.
2. **Users**: API developers (seed/build/generate).
3. **Outcome**: single canonical path `apps/api/src/generated/prisma`.
4. **Non-goals**: no schema/migration/business-logic changes; do not revert output path.
5. **Edge case**: fix seed import **before** deleting the legacy tree.
6. **Rollback**: restore deleted files from git if needed.

## Scope

### In Scope

- Retarget `apps/api/prisma/seed.ts` to `../src/generated/prisma/client`.
- Delete tracked `apps/api/generated/**`.
- Gitignore `apps/api/generated/` (keep `src/generated/`).
- Update `apps/api/README.md` (drop `packages/api` / `packages/database` docs).
- Optionally align `turbo.json` build outputs with `src/generated/**`.
- Note supersession of leftover hygiene in `merge-database-into-api` (no reopen).

### Out of Scope

- Schema `output`, migrations, or `src/db` runtime behavior.
- Reverting generator output to package-root `generated/`.
- Spec edits for stale `@hubilee/database` wording.
- Archiving `merge-database-into-api` (later).

## Capabilities

### New Capabilities

None

### Modified Capabilities

None

(Pure refactor — no requirement-level change.)

## Approach

**Surgical cleanup (Explore Approach 1):** keep `output = "../src/generated/prisma"`. Order: (1) seed + gitignore, (2) delete legacy tree, (3) README (+ optional turbo), (4) smoke generate / seed / typecheck.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/api/prisma/seed.ts` | Modified | Import canonical generated client |
| `apps/api/generated/**` | Removed | Delete legacy tracked Prisma Client |
| `apps/api/.gitignore` | Modified | Ignore `/generated/` |
| `apps/api/README.md` | Modified | Document `apps/api` + local generate |
| `turbo.json` | Modified (optional) | Cache `src/generated/**` |
| `merge-database-into-api` | Process | Superseded for this leftover |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Seed breaks if delete precedes import fix | Med | Ordered tasks: seed first |
| Hidden refs to `apps/api/generated` | Low | Repo grep + smoke generate/seed |
| Large delete PR (~128 files) | Med | Review as generated noise |
| Turbo under-caches `src/generated/**` | Low | Optional turbo outputs update |

## Rollback Plan

Restore deleted `apps/api/generated/**` from the pre-change commit; revert seed, `.gitignore`, README (and turbo if changed). No DB migration rollback.

## Dependencies

- Exploration: `openspec/changes/dedupe-api-prisma-generated/exploration.md`
- Related: `openspec/changes/merge-database-into-api/` (hygiene only)

## Success Criteria

- [ ] Canonical path only: `apps/api/src/generated/prisma`
- [ ] `apps/api/generated/` absent and gitignored
- [ ] Seed imports canonical path; `db:generate` + seed/typecheck smoke pass
- [ ] README no longer documents `packages/database` / `packages/api` for this flow
