# Proposal: Merge @hubilee/database into @hubilee/api

## Intent
`@hubilee/database` is only consumed by `@hubilee/api`. Maintaining it as a separate workspace adds build complexity (separate `prisma generate` + `tsc` step, needs `DATABASE_URL` for Vercel builds, 10 root scripts, turbo graph coordination). Merging into `apps/api/` eliminates an entire build pipeline and simplifies the dependency graph.

## Scope
### In Scope
- Move prisma schema, migrations, seed, and client into `apps/api/`
- Update all imports and build configuration
- Update `turbo.json`, root scripts, and Docker entrypoint
- Remove `packages/database/` directory

### Out of Scope
- Schema changes or migrations
- Refactoring the Prisma client itself
- Changing any business logic

## Capabilities
### New Capabilities
None — pure refactor, no new behavior.

### Modified Capabilities
None — no spec-level behavior changes.

## Approach
Full merge into `apps/api/`. Move `packages/database/prisma/*` → `apps/api/prisma/*` (schema, seed, migrations), move client source into `apps/api/src/db/`, consolidate build into a single `prisma generate` + `tsc` step within the api workspace, update `turbo.json` pipeline to remove the database workspace dependency, update root scripts and Docker entrypoint filter targets, and delete `packages/database/`.

The only source-level changes are in `apps/api/src/db/index.ts` (re-export becomes local import) and a handful of files importing `PrismaClient` directly.

## Affected Areas
| Area | Impact | Description |
|------|--------|-------------|
| `packages/database/*` | Removed | Entire directory deleted |
| `apps/api/prisma/*` | New | Schema, migrations, seed moved here |
| `apps/api/src/db/*` | Modified | Local imports instead of workspace dep |
| `apps/api/package.json` | Modified | Scripts consolidated, deps updated |
| `turbo.json` | Modified | Remove database workspace dependency |
| `docker/api-entrypoint.sh` | Modified | Update filter target |
| root `package.json` | Modified | Update script targets |

## Risks
| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Prisma config doesn't load from new path | Low | Test `prisma generate` from `apps/api/` |
| Integration tests fail with wrong filter target | Low | Run test suite after changes |
| Vercel build breaks if config path wrong | Medium | Test deploy with preview before prod |
