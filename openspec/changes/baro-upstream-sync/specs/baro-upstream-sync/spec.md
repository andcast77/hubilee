# Baro Upstream Sync Specification

## Purpose

Define how product code from upstream `https://github.com/andcast77/baro` branch **`main`** is merged into integrated `apps/baro` without breaking `baro-auth-integration` or `baro-data-model` invariants.

## Requirements

### Requirement: Upstream Source Branch

Sync operations MUST use upstream branch **`main`** as the sole source of truth for this change. Other upstream branches MUST NOT be merged unless covered by a separate SDD change.

#### Scenario: Valid sync source

- GIVEN a sync run for this capability
- WHEN selecting the upstream revision
- THEN the revision MUST be reachable from `andcast77/baro` **`main`**
- AND the sync record MUST note the upstream commit SHA

#### Scenario: Feature branch excluded

- GIVEN an upstream commit exists only on `feat/*` and not on `main`
- WHEN performing this sync
- THEN that commit MUST NOT be included

### Requirement: Integration Denylist

The sync MUST NOT introduce standalone baro persistence or auth into `apps/baro`. The following upstream paths MUST be excluded or rejected on merge: `prisma/**`, `prisma.config.ts`, `app/api/auth/**`, `lib/prisma.ts`, `lib/auth/jwt.ts`, `lib/auth/crypto.ts`, `lib/auth/cookies.ts`, `lib/auth/schemas.ts`, standalone `compose.yaml`, `ecosystem.config.cjs`, and granular `lib/expediente/actions/{colindantes,datos-generales,publicacion-acta,titulo-relacion}.ts`.

#### Scenario: Denied path not present after sync

- GIVEN a completed sync from upstream `main`
- WHEN inspecting `apps/baro`
- THEN `apps/baro/prisma/` MUST NOT exist
- AND `apps/baro/app/api/auth/` MUST NOT exist
- AND no file under `apps/baro` MUST import `@prisma/client` for baro domain data

#### Scenario: Denylist conflict resolution

- GIVEN an upstream change touches a denylisted path
- WHEN resolving the merge
- THEN the monorepo integration shape MUST be kept
- AND equivalent behavior MUST be routed through `/v1/baro/*` or preserved monorepo adapters

### Requirement: API Integration Layer Preservation

`apps/baro/lib/api/**` MUST remain the data and auth boundary. Upstream sync MUST NOT remove or replace this layer with direct database access.

#### Scenario: Server action uses API

- GIVEN an upstream server action that wrote via Prisma
- WHEN ported into `apps/baro`
- THEN the action MUST call `serverBaro*` helpers or equivalent API client wrappers
- AND MUST NOT access `@hubilee/database` or Prisma from the app

#### Scenario: Session from shared auth

- GIVEN a ported server action requires authentication
- WHEN executed in `apps/baro`
- THEN session resolution MUST use the integrated hubilee session model
- AND MUST NOT use upstream JWT or refresh-token flows

### Requirement: Schema and API Parity

Upstream schema or mutation changes MUST be reflected in `packages/database` `Baro*` models and `/v1/baro/*` contracts before the corresponding UI ships.

#### Scenario: New baro field on upstream main

- GIVEN upstream `main` adds a baro domain field
- WHEN syncing the dependent UI or action
- THEN a migration MUST exist under `packages/database/prisma/migrations/`
- AND DTOs, contracts, and `baro.service.ts` MUST expose the field with tenant scoping

#### Scenario: UI-only upstream change

- GIVEN upstream changes affect presentation only
- WHEN syncing into `apps/baro`
- THEN no database migration is required
- AND existing API responses MUST remain sufficient for the UI

### Requirement: Pre-Ship Verification

Each sync phase MUST pass automated verification before merge to the target branch.

#### Scenario: App and API tests pass

- GIVEN a completed sync phase
- WHEN running verification
- THEN `pnpm --filter @hubilee/baro test` MUST pass
- AND baro API tenant-isolation tests MUST pass
- AND repository typecheck MUST pass

#### Scenario: Canonical spec compliance

- GIVEN a completed sync
- WHEN validating against `openspec/specs/baro-auth-integration/` and `openspec/specs/baro-data-model/`
- THEN no requirement in those specs MUST be violated

### Requirement: Sync Inventory and Baseline

Each sync run MUST record the upstream commit SHA and a classified change inventory (UI, action, schema, test, deny) before applying patches.

#### Scenario: Baseline documented

- GIVEN a sync is started
- WHEN the inventory step completes
- THEN the change artifacts MUST record upstream SHA and monorepo baseline
- AND each touched path MUST be classified for adapter handling
