# API Prisma Client Location Specification

Canonical spec (created from change `dedupe-api-prisma-generated`, archived 2026-07-21). See `apps/api/prisma/schema.prisma`, `apps/api/src/db/`, `apps/api/prisma/seed.ts`.

## Purpose

Keep a single canonical Prisma Client generate output under `@hubilee/api` so seed, runtime, and docs do not diverge after the database→api merge.

## Requirements

### Requirement: Canonical Prisma generate output

`@hubilee/api` MUST treat `apps/api/src/generated/prisma` as the sole Prisma Client generate output. The Prisma schema generator `output` MUST resolve to that path. Runtime DB modules and the Prisma seed entrypoint MUST import the generated client from that tree (directly or via a side-effect-free re-export of the same artifacts).

#### Scenario: Schema output points at src/generated

- GIVEN `apps/api/prisma/schema.prisma`
- WHEN the Prisma client generator `output` is inspected
- THEN it MUST resolve to `apps/api/src/generated/prisma`
- AND MUST NOT target package-root `apps/api/generated/prisma`

#### Scenario: Seed and runtime share one client tree

- GIVEN a successful `prisma generate` for `@hubilee/api`
- WHEN `apps/api/src/db` and `apps/api/prisma/seed.ts` resolve Prisma Client imports
- THEN both MUST load artifacts from `apps/api/src/generated/prisma`
- AND seed MUST NOT depend on `apps/api/generated/`

### Requirement: No tracked legacy package-root generated tree

The repository MUST NOT track a second Prisma Client tree at `apps/api/generated/`. `apps/api` MUST gitignore package-root `generated/` (or `/generated/`) so a mistaken generate cannot reintroduce that path as tracked source. Docs for `@hubilee/api` MUST describe generate/seed under `apps/api` and MUST NOT instruct using removed `packages/database` or `packages/api` paths for this flow.

#### Scenario: Legacy tree absent after cleanup

- GIVEN the change is applied on a clean checkout
- WHEN inspecting `apps/api/generated/`
- THEN that directory MUST NOT exist as tracked content
- AND `apps/api/.gitignore` MUST ignore package-root `generated/`

#### Scenario: README matches apps/api layout

- GIVEN `apps/api/README.md`
- WHEN a developer follows generate/deploy guidance for the Prisma client
- THEN instructions MUST refer to `apps/api` (and local `prisma generate` as needed)
- AND MUST NOT document `packages/database` or `packages/api` as the home for this client
