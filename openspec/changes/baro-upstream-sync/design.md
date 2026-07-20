# Design: Baro Upstream Sync

## Technical Approach

Selective port of `andcast77/baro` **`main`** into `apps/baro` using rsync with denylist, preserving monorepo integration artifacts (`lib/api/**`, adapted server actions, Docker, `@hubilee/baro` package.json). Upstream schema/API deltas land in `packages/database` and `packages/api` only when inventory finds data-model changes.

## Architecture Decisions

### Decision: Sync mechanism

**Choice**: One-shot rsync + protected-file restore (not git subtree merge).
**Alternatives**: Full git merge of upstream into subtree; manual file-by-file cherry-pick.
**Rationale**: Upstream tree lacks monorepo paths; rsync with denylist is predictable and matches spec denylist.

### Decision: Conflict resolution priority

**Choice**: Integration layer wins over upstream for auth/data; upstream wins for UI/tests/locales/DOCX.
**Alternatives**: Upstream wins everywhere; monorepo wins everywhere.
**Rationale**: Preserves `baro-auth-integration` and `baro-data-model` without re-breaking actions.

### Decision: API parity check

**Choice**: After app sync, diff upstream `update-all.ts` / `nueva.ts` logic against `baro.service.ts`; patch service/DTO/contracts if upstream added validation or fields.
**Alternatives**: Blind copy upstream actions with Prisma.
**Rationale**: Monorepo actions are thin API wrappers; business logic lives in API service.

## Data Flow

```
upstream main (andcast77/baro)
        │ rsync (denylist)
        ▼
   apps/baro (UI, stores, tests, DOCX)
        │ serverBaro* / baroApi
        ▼
   @hubilee/api /v1/baro/*
        │
        ▼
   packages/database (Baro* models)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/baro/**` | Modify | Upstream UI, tests, locales, DOCX (excl. denylist) |
| `apps/baro/lib/api/**` | Preserve | Never overwritten |
| `apps/baro/lib/expediente/actions/{update-all,nueva,delete}.ts` | Preserve/merge | Keep API-backed versions |
| `apps/baro/package.json` | Preserve | `@hubilee/baro`, port 3006 |
| `packages/api/src/services/baro.service.ts` | Modify | If upstream logic delta detected |
| `packages/database/prisma/**` | Modify | Only if upstream schema delta vs Baro* |
| `openspec/changes/baro-upstream-sync/upstream-baseline.md` | Create | Record SHA + inventory |

## Interfaces / Contracts

No new HTTP routes. Existing `/v1/baro/*` and `@hubilee/contracts` baro types remain; extend only when upstream adds fields.

## Testing Strategy

- `pnpm --filter @hubilee/baro test`
- `pnpm --filter @hubilee/api test -- baro-tenant-isolation`
- Root `pnpm typecheck` if available

## Migration / Rollback

Revert sync commit(s). Restore protected paths from git. Roll back DB migration only if one was added.
