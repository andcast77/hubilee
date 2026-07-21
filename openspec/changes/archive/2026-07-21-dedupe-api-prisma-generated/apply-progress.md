# Apply Progress: dedupe-api-prisma-generated

**Mode**: Standard (strict_tdd config true; change design/tasks waive unit RED tests — smoke + absence of legacy paths only)
**Status**: 8/8 tasks complete
**applyState**: all_done

## Completed Tasks

- [x] 1.1 Seed import → `../src/generated/prisma/client`
- [x] 1.2 `.gitignore` add `/generated/` (kept `src/generated/`)
- [x] 2.1 `git rm -r apps/api/generated/`
- [x] 2.2 README: `apps/api` + `src/generated/prisma`; removed `packages/api` / `packages/database` for this flow
- [x] 2.3 turbo build outputs: `src/generated/**` (dropped `generated/**`)
- [x] 3.1 `pnpm --filter @hubilee/api run db:generate` → `./src/generated/prisma`
- [x] 3.2 Grep: zero `apps/api/generated` refs; seed uses canonical import
- [x] 3.3 Typecheck: no `typecheck` script on package; `pnpm exec tsc --noEmit -p tsconfig.json` in `apps/api` exit 0

## Work Unit Evidence

| Evidence | Result |
|----------|--------|
| Focused test command | `pnpm --filter @hubilee/api run db:generate` → exit 0; Generated Prisma Client to `./src/generated/prisma` |
| Runtime harness | `tsx` import of `./src/generated/prisma/client` → `seed-canonical-resolve:ok`; `tsc --noEmit` exit 0 for `src/**` (package has no `typecheck` script; seed not in tsconfig include) |
| Rollback boundary | Revert `seed.ts`, `.gitignore`, `README.md`, `turbo.json`; restore `apps/api/generated/**` from pre-change commit |

## Deviations

- Task 3.3 script `typecheck` absent on `@hubilee/api`; used equivalent `tsc --noEmit -p tsconfig.json` (exit 0).

## Files Changed

| File | Action |
|------|--------|
| `apps/api/prisma/seed.ts` | Modified |
| `apps/api/.gitignore` | Modified |
| `apps/api/generated/**` | Deleted (git rm) |
| `apps/api/README.md` | Modified |
| `turbo.json` | Modified |
| `openspec/changes/dedupe-api-prisma-generated/tasks.md` | All `[x]` |
