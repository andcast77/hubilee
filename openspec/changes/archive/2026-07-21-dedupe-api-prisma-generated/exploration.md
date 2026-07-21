## Exploration: Deduplicate Prisma generated client under `@hubilee/api`

### Current State

After commit `5233544` ("relocated database files"), `@hubilee/database` was folded into `apps/api/`. The live Prisma schema and runtime client already point at **`apps/api/src/generated/prisma`**, but a **legacy tracked tree** remains at **`apps/api/generated/`** (snapshot from the old `output = "../generated/prisma"` layout).

| Tree | Role | Git | Files (approx) | Size |
|------|------|-----|----------------|------|
| `apps/api/src/generated/` | **Canonical** — `prisma generate` target | Ignored (`apps/api/.gitignore` → `src/generated/`) | ~65 | ~6.2M |
| `apps/api/generated/` | **Legacy** — stale copy still tracked | Tracked (128 files) | ~128 | ~7.0M |
| `apps/api/dist/generated/` | `tsc` emit of compiled client | Build output (`dist/` ignored) | n/a | n/a |

Verified facts:

- `apps/api/prisma/schema.prisma` generator: `output = "../src/generated/prisma"`.
- `apps/api/src/db/client.ts` / `index.ts` import `../generated/prisma/client` → resolves to **`apps/api/src/generated/...`** (from `src/db/`).
- `apps/api/prisma/seed.ts` imports `../generated/prisma/client` → resolves to **`apps/api/generated/...`** (from `prisma/`). Same relative string, different roots — only seed still depends on the legacy tree.
- Legacy `inlineSchema` embeds `output = "../generated/prisma"`; canonical embeds `output = "../src/generated/prisma"`. Legacy also has ~63 `.js` sidecars; canonical has none.
- `packages/database/` is gone. Related incomplete change: `openspec/changes/merge-database-into-api/` (proposal + tasks; merge applied, leftover paths remain).
- `apps/api/README.md` still documents `packages/api/` and `packages/database` Vercel include steps.
- Root `turbo.json` build `outputs` still lists `generated/**` (matches legacy path shape; does not list `src/generated/**`).
- No main OpenSpec capability currently encodes “single Prisma output path”; `openspec/specs/turborepo-workspace-conventions` still mentions `@hubilee/database` as an internal library name.

### Affected Areas

- `apps/api/generated/**` — delete legacy tracked Prisma Client (~128 files / ~7MB).
- `apps/api/prisma/seed.ts` — retarget PrismaClient import to canonical tree (or via `src/db`).
- `apps/api/.gitignore` — keep `src/generated/`; **add** `generated/` (or `/generated/`) so a mistaken regenerate cannot re-commit the old path.
- `apps/api/README.md` — replace `packages/api` / `packages/database` deploy docs with `apps/api` + local `prisma generate`.
- `turbo.json` (optional, recommended) — align build `outputs` with `src/generated/**` (and drop or keep `generated/**` only as a dead cache pattern).
- `openspec/changes/merge-database-into-api/` — process follow-up: archive or mark leftover cleanup superseded by this change (not required for the code fix).
- `openspec/specs/turborepo-workspace-conventions` — out of scope unless propose phase widens to strip stale `@hubilee/database` wording.

### Approaches

1. **Surgical cleanup (recommended)** — Fix seed import to `../src/generated/prisma/client`, delete `apps/api/generated/`, gitignore root `generated/`, fix README; optionally update turbo outputs.
   - Pros: Matches user intent; single source of truth; removes ~7MB tracked noise; small authored diff; seed and runtime share the same generate output.
   - Cons: Large delete commit (generated files); seed breaks until import is fixed (order: fix seed first, then delete).
   - Effort: Low

2. **Seed via `src/db` exports** — Change seed to `import { PrismaClient } from '../src/db/client'` (or shared type-only + local `new PrismaClient`), then delete legacy tree.
   - Pros: Avoids hardcoding generated path in seed; one public entry for Prisma types.
   - Cons: `src/db/client.ts` currently throws if `DATABASE_URL` unset and instantiates a singleton — seed already builds its own client with `DB_TARGET` / adapters, so importing the module is unsafe unless seed only imports types from a path that does not side-effect. Prefer `../src/generated/prisma/client` or a thin type re-export without singleton init.
   - Effort: Low–Medium (needs care around side effects)

3. **Revert generator to `apps/api/generated/`** — Point schema `output` back to `../generated/prisma`, update `src/db` imports, keep one tree at package root.
   - Pros: Seed’s current relative import keeps working without change.
   - Cons: Fights the already-chosen canonical path; would re-track or re-gitignore a large tree; `src/db` and gitignore already aligned on `src/generated/`.
   - Effort: Medium (unnecessary churn)

4. **Fold into `merge-database-into-api` instead of a new change** — Append leftover tasks to the incomplete change rather than `dedupe-api-prisma-generated`.
   - Pros: Continues the original narrative.
   - Cons: Merge change’s tasks assume pre-merge work; harder to review; user already named a dedicated cleanup change.
   - Effort: Low (process only)

### Recommendation

**Approach 1.** Keep `output = "../src/generated/prisma"` as canonical. Fix `seed.ts` to import from `../src/generated/prisma/client`, delete the tracked `apps/api/generated/` tree, add `/generated/` (or `generated/`) under `apps/api/.gitignore` alongside existing `src/generated/`, and refresh README paths away from `packages/database` / `packages/api`. Optionally update `turbo.json` build outputs to `src/generated/**`.

Apply order: (1) seed import + gitignore, (2) delete legacy tree, (3) README (+ turbo), (4) `pnpm --filter @hubilee/api db:generate` then seed/typecheck smoke.

Do **not** reopen schema output location. Treat `merge-database-into-api` as superseded for this leftover; archive it after this change ships (or note supersession in propose).

### Risks

- **Seed breaks** if legacy tree is deleted before the import fix (mitigate with ordered tasks).
- **Stale local caches / CI** if something still assumes `apps/api/generated` on disk (mitigate: grep + `db:generate` + seed dry-run).
- **Turbo cache outputs** may under-cache `src/generated/**` until `turbo.json` is updated (low severity; generate already runs in `build`).
- **PR size**: ~128 file deletions of generated code — high file count, low authored risk; still worth calling out for reviewers.
- **Incomplete sibling change** may confuse archive/history unless explicitly superseded.

### Ready for Proposal

**Yes.** Scope is clear, facts verified, approach agreed with user intent. Orchestrator should run **sdd-propose** for `dedupe-api-prisma-generated` with Approach 1, rollback = restore deleted tree from git + revert seed/gitignore/README, and note supersession of leftover `merge-database-into-api` cleanup.
