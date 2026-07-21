# Design: Deduplicate API Prisma generated client

## Technical Approach

Surgical cleanup only: keep schema `output = "../src/generated/prisma"` unchanged. Retarget the sole live consumer of the legacy tree (`prisma/seed.ts`), gitignore package-root `generated/`, delete tracked `apps/api/generated/**`, refresh README paths to `apps/api`, and align Turbo build outputs with `src/generated/**`. No schema, migration, or runtime `src/db` behavior changes.

Maps to proposal Approach 1 / exploration recommendation. Pure hygiene — no requirement-level capability deltas.

## Architecture Decisions

### Decision: Canonical output stays under `src/generated`

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Keep `../src/generated/prisma` | Matches schema + `src/db`; seed needs one import fix | **Chosen** |
| Revert output to `../generated/prisma` | Unblocks seed without edit; fights merge layout; re-tracks large tree | Rejected |
| Seed via `../src/db/client` | Avoids generated path string; module throws without `DATABASE_URL` and creates singleton — unsafe for seed’s own client | Rejected |

**Rationale**: Runtime already resolves `../generated/prisma/client` from `src/db/` to the canonical tree. Seed uses the same relative string from `prisma/`, which incorrectly hits the legacy root. Fix the path; do not move the generator.

### Decision: Ordered apply — seed + gitignore before delete

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Fix seed (+ gitignore), then delete tree | Temporary dual trees until delete; seed never breaks mid-PR | **Chosen** |
| Delete first, then fix seed | Short window where seed cannot resolve client | Rejected |

**Rationale**: Proposal edge case — seed is the only import of `apps/api/generated/`. Gitignore `/generated/` in the same step prevents accidental re-commit if someone regenerates to the old path.

### Decision: Include Turbo outputs update in this change

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Add `src/generated/**`; drop stale `generated/**` from build outputs | Small authored diff; correct cache fingerprint | **Chosen** |
| Defer turbo.json | Leaves dead `generated/**` cache pattern | Rejected as default |

**Rationale**: Exploration flagged under-caching; update is optional in proposal but low-risk and in-scope — do it with the README hygiene commit/step.

### Decision: Supersede leftover `merge-database-into-api` hygiene (process only)

**Choice**: Note supersession in this change; do not reopen or append tasks to `merge-database-into-api`. Archive that change later.

**Rationale**: User named a dedicated cleanup change; merge tasks assume pre-merge work.

## Data Flow

No runtime data-flow change. Generate/consume layout after cleanup:

```
prisma/schema.prisma
  output → apps/api/src/generated/prisma   (canonical; gitignored)
                ↑
   src/db/* ────┘  (unchanged relative imports)
   prisma/seed.ts → ../src/generated/prisma/client  (fixed)

apps/api/generated/  → DELETED + /generated/ gitignored
```

Sequence diagram: omitted (file hygiene; no multi-step runtime protocol).

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/api/prisma/seed.ts` | Modify | `../generated/prisma/client` → `../src/generated/prisma/client` |
| `apps/api/.gitignore` | Modify | Add `/generated/` (keep `src/generated/`) |
| `apps/api/generated/**` | Delete | Remove ~128 tracked legacy Prisma Client files |
| `apps/api/README.md` | Modify | Replace `packages/api` / `packages/database` docs with `apps/api` + local `prisma generate` / deploy notes |
| `turbo.json` | Modify | Build `outputs`: use `src/generated/**` instead of (or in addition to dropping) `generated/**` |

## Interfaces / Contracts

No new public types or APIs. Seed continues to construct `new PrismaClient({ adapter, ... })` from the generated client module — only the import path changes:

```ts
import { PrismaClient } from '../src/generated/prisma/client'
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | N/A for generated delete | No new unit logic |
| Smoke / integration | Generate + seed resolve + typecheck | `pnpm --filter @hubilee/api db:generate`; seed smoke (or typecheck that seed imports resolve); `pnpm --filter @hubilee/api typecheck` |
| Repo guard | No remaining refs to package-root generated | Grep `apps/api/generated` and seed import string after delete |
| E2E | N/A | Out of scope |

Strict TDD: no RED product tests required; verification is smoke + absence of legacy paths.

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No DB migration. Single PR (large delete of generated files, small authored diff).

**Ordered steps**

1. Change seed import; add `/generated/` to `apps/api/.gitignore`.
2. `git rm -r apps/api/generated/` (or equivalent delete of tracked tree).
3. Update `apps/api/README.md` and `turbo.json` outputs.
4. Smoke: `db:generate`, seed/typecheck; confirm no tracked files under `apps/api/generated/`.

**Rollback**: Restore `apps/api/generated/**` from the pre-change commit; revert seed, `.gitignore`, README, and `turbo.json`. No migration rollback.

## Open Questions

- [x] Seed import path — `../src/generated/prisma/client` (not via `src/db`)
- [x] Turbo outputs — include in this change
- [ ] Exact README rewrite depth (minimal path fixes vs full Vercel section refresh) — prefer minimal accurate `apps/api` paths; no blocker
