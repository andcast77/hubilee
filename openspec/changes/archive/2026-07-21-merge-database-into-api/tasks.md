# Tasks: Merge @hubilee/database into @hubilee/api

Total: 15 tasks across 4 phases

> **Archive reconciliation (2026-07-21):** All implementation tasks marked `[x]` at archive time. Checkboxes were stale (Phases 1–3 unchecked; Phase 4 used ✅ emoji only). Work is complete in the codebase (`packages/database/` absent; `apps/api/prisma/schema.prisma` and `apps/api/src/db/client.ts` present). User requested intentional partial archive. See `archive-report.md`.

---

## Phase 1 — Foundation: Move files and update build config

### Task 1.1: Move prisma/ directory and config files

- [x] 1.1 Move `packages/database/prisma/*` → `apps/api/prisma/*`

**Action**: Move `packages/database/prisma/*` → `apps/api/prisma/*`

**Details**:
- `packages/database/prisma/schema.prisma` → `apps/api/prisma/schema.prisma`
- `packages/database/prisma/migrations/*` → `apps/api/prisma/migrations/*`
- `packages/database/prisma/seed.ts` → `apps/api/prisma/seed.ts`
- `packages/database/prisma.config.ts` → `apps/api/prisma.config.ts`

**Verification**: `ls apps/api/prisma/` shows schema + migrations. `ls apps/api/prisma.config.ts` exists.

---

### Task 1.2: Move database source files into apps/api/src/db/

- [x] 1.2 Move `packages/database/src/` files into `apps/api/src/db/`

**Action**: Move `packages/database/src/` files into `apps/api/src/db/`

**Details**:
- `packages/database/src/client.ts` → `apps/api/src/db/client.ts`
- `packages/database/src/adapter-selection.ts` → `apps/api/src/db/adapter-selection.ts`
- `packages/database/src/index.ts` → `apps/api/src/db/index.ts` (content will be updated in Task 2.1)

**Verification**: Files exist at target paths. Old paths no longer exist.

---

### Task 1.3: Update apps/api/package.json — deps and scripts

- [x] 1.3 Add Prisma dependencies, migrate/seed/studio scripts, remove `@hubilee/database` dependency

**Action**: Add Prisma dependencies, migrate/seed/studio scripts, remove `@hubilee/database` dependency

**Details**:
- Add devDeps: `prisma`, `@types/bcryptjs` (moved from `packages/database/devDependencies`)
- Add scripts:
  - `"db:generate": "prisma generate"`
  - `"db:migrate": "prisma migrate dev"`
  - `"db:studio": "prisma studio"`
  - `"db:seed": "tsx prisma/seed.ts"`
  - `"db:reset": "prisma migrate reset --force"`
- Remove `@hubilee/database` from dependencies
- Add `@prisma/client` to dependencies (if not already present)

**Verification**: `node -e "require('./apps/api/package.json').scripts"` shows new scripts, `@hubilee/database` not in deps.

---

### Task 1.4: Move scripts/ files

- [x] 1.4 Move `packages/database/scripts/*` → `apps/api/scripts/prisma/*`

**Action**: Move `packages/database/scripts/*` → `apps/api/scripts/prisma/*`

**Details**:
- Create `apps/api/scripts/prisma/` directory
- Copy/move scripts files

**Verification**: `ls apps/api/scripts/prisma/` matches previous `packages/database/scripts/` content.

---

## Phase 2 — Core: Update imports and build

### Task 2.1: Update apps/api/src/db/index.ts

- [x] 2.1 Change re-export from workspace dependency to local import

**Action**: Change re-export from workspace dependency to local import

**Details**:
- Replace `export { prisma, Prisma } from '@hubilee/database'` with:
```ts
import { PrismaClient } from '@prisma/client'
import { prisma } from './client'
import * as Prisma from '@prisma/client'
export { prisma, Prisma }
```
- Adjust as needed to match actual export surface

**Verification**: `npx tsc --noEmit` in `apps/api/` passes.

---

### Task 2.2: Update direct PrismaClient imports (files)

- [x] 2.2 Change files importing `PrismaClient` type from `@hubilee/database` to relative path

**Action**: Change 3 files importing `PrismaClient` type from `@hubilee/database` to relative path

**Details**:
- Find files with `import type { PrismaClient } from '@hubilee/database'` using `rg`
- Change to `import type { PrismaClient } from '../db/client'` (adjust relative path per file)
- Known candidates from proposal:
  - Files under `apps/api/src/` that reference `@hubilee/database`

**Verification**: `npx tsc --noEmit` passes across entire api workspace.

---

### Task 2.3: Update apps/api/scripts/rotate-field-key.ts import

- [x] 2.3 Change import path from `@hubilee/database` to relative path

**Action**: Change import path from `@hubilee/database` to relative path

**Details**:
- Update import to point to `../src/db/client` or wherever the PrismaClient lives

**Verification**: Script can be imported/compiled without errors.

---

### Task 2.4: Consolidate build script

- [x] 2.4 Update `apps/api/package.json` build script to `prisma generate && tsc`

**Action**: Update `apps/api/package.json` build script

**Details**:
- Change `"build"` to `"prisma generate && tsc"`
- Ensure `prisma generate` runs before `tsc` in the pipeline

**Verification**: `npm run build` in `apps/api/` runs prisma generate then compiles successfully.

---

## Phase 3 — Infrastructure: Update turbo, scripts, Docker

### Task 3.1: Update turbo.json pipeline

- [x] 3.1 Remove `@hubilee/database` outputs and references from the build task pipeline

**Action**: Remove `@hubilee/database` outputs and references from the build task pipeline

**Details**:
- In `turbo.json`, find `"@hubilee/database#build"` or equivalent pipeline entry and remove it
- Remove `packages/database` from any dependsOn lists in the api build task
- The api build no longer depends on database build completing

**Verification**: `npx turbo build --dry=json` shows no database workspace in the execution plan.

---

### Task 3.2: Update root package.json scripts

- [x] 3.2 Update root scripts from `--filter=@hubilee/database` to `--filter=@hubilee/api`

**Action**: Update ~10 scripts from `--filter=@hubilee/database` to `--filter=@hubilee/api`

**Details**:
- Find all root scripts referencing `@hubilee/database`:
  - `db:generate`, `db:migrate`, `db:studio`, `db:seed`, `db:reset`, etc.
- Change filter from `@hubilee/database` to `@hubilee/api`
- Script names can stay the same since they now target api

**Verification**: `grep -r '@hubilee/database' package.json` returns no matches.

---

### Task 3.3: Update docker/api-entrypoint.sh

- [x] 3.3 Change `--filter=@hubilee/database` to `--filter=@hubilee/api`

**Action**: Change `--filter=@hubilee/database` to `--filter=@hubilee/api`

**Details**:
- Find the line running `prisma generate` or database scripts with the old filter
- Update to target `@hubilee/api`

**Verification**: `grep '@hubilee/database' docker/api-entrypoint.sh` returns no matches.

---

### Task 3.4: Update integration test setup

- [x] 3.4 Update filter targets in `apps/api/src/__tests__/integration/setup.ts`

**Action**: Update filter targets in `apps/api/src/__tests__/integration/setup.ts`

**Details**:
- Change any `--filter=@hubilee/database` references to `--filter=@hubilee/api`

**Verification**: Integration tests run successfully.

---

## Phase 4 — Cleanup: Remove database package

### Task 4.1: Delete packages/database/ directory

- [x] 4.1 Remove entire `packages/database/` directory

**Action**: Remove entire `packages/database/` directory

**Details**:
- `rm -rf packages/database/`
- Verify no files remain

**Verification**: `ls packages/database/` returns "No such file or directory".

---

### Task 4.2: Update .gitignore if needed

- [x] 4.2 Check and update `.gitignore` for relocated generated files

**Action**: Check and update `.gitignore` for relocated generated files

**Details**:
- `packages/database/.gitignore` may have entries for `node_modules/.prisma/client` or generated types
- If so, add equivalent entries under `apps/api/` paths
- If entries are already generic (`node_modules/`, `*.generated.ts`), no change needed

**Verification**: `git status --ignored` shows expected generated files ignored.

---

### Task 4.3: Verify build works end-to-end

- [x] 4.3 Full clean build verification

**Action**: Full clean build verification

**Details**:
- `rm -rf node_modules apps/api/node_modules`
- `pnpm install` (or whatever package manager)
- `pnpm run build` from root
- Integration tests pass
- Type check passes

**Verification**: All commands exit 0.
