# Turborepo Workspace Conventions Specification

Canonical spec (merged from change `turborepo-conventions`, 2026-06-07). See root `package.json`, `turbo.json`, `.github/workflows/ci.yml`, `apps/api/`, `packages/ui/`, `packages/shared/`.

## Purpose

Define monorepo workspace layout, internal package contracts, task orchestration, and CI behavior aligned with official Turborepo conventions.

## Requirements

### Requirement: Deployable vs Library Layout

Deployable applications MUST live under `apps/`. Shared libraries MUST live under `packages/`. `@hubilee/api` MUST reside at `apps/api/`. Package folder names MUST match npm scope names where applicable (e.g. `packages/ui` for `@hubilee/ui`).

#### Scenario: API deployable location

- GIVEN the monorepo workspace
- WHEN locating `@hubilee/api` source
- THEN it MUST be under `apps/api/`
- AND MUST NOT remain under `packages/api/`

#### Scenario: UI package folder name

- GIVEN the `@hubilee/ui` package
- WHEN navigating the repository
- THEN its directory MUST be `packages/ui/`

### Requirement: Internal Library Build Contract

Internal library packages (`@hubilee/shared`, `@hubilee/contracts`, `@hubilee/ui`, `@hubilee/database`) MUST expose production entrypoints from built artifacts (`dist/` or documented generated output). Libraries MUST NOT export raw TypeScript source as the primary runtime entry for dependent apps.

#### Scenario: Shared package builds before apps

- GIVEN a clean checkout
- WHEN `pnpm turbo run build --filter=@hubilee/hub...` runs
- THEN `@hubilee/shared` MUST build to `dist/` before `@hubilee/hub` builds
- AND hub MUST resolve `@hubilee/shared` via workspace package exports

### Requirement: Root Script Delegation

Root `package.json` scripts for build, dev, lint, test, and typecheck MUST delegate to `turbo run <task>`. Root scripts MUST NOT invoke app build tools directly (e.g. `next build` without Turbo).

#### Scenario: Root build delegates to Turbo

- GIVEN the root `package.json`
- WHEN the `build` script runs
- THEN it MUST execute `turbo run build`

### Requirement: Filter Closure for Dev and Build

Per-app convenience scripts MUST use Turborepo filter closure (`--filter=<package>...`) to include upstream workspace dependencies in the task graph.

#### Scenario: Hub dev includes dependencies

- GIVEN root script `dev:hub`
- WHEN executed
- THEN it MUST run `turbo run dev --filter=@hubilee/hub...`
- AND MUST NOT rely on listing multiple unrelated filters without closure

### Requirement: Uniform Task Graph

`turbo.json` MUST define uniform task definitions for `build`, `dev`, `lint`, `typecheck`, and `test` without package-specific overrides unless documented in design with justification. `build` MUST declare `dependsOn: ["^build"]` and correct outputs for `.next/` and `dist/`.

#### Scenario: No baro-only build override

- GIVEN `turbo.json` after realignment
- WHEN inspecting task definitions
- THEN `@hubilee/baro#build` package-specific overrides MUST NOT exist
- AND baro MUST use the shared `build` task definition

### Requirement: CI Affected Runs

Pull-request CI MUST run lint, typecheck, test, and build using `turbo run … --affected` with full git history (`fetch-depth: 0`) against base branches `v2` and `main`.

#### Scenario: PR runs affected tasks only

- GIVEN a pull request changing only `apps/hub`
- WHEN CI lint/test/build jobs run
- THEN they MUST use `turbo run … --affected`
- AND MUST NOT require a full monorepo rebuild of unrelated packages when unaffected

#### Scenario: Full history for affected detection

- GIVEN the CI checkout step
- WHEN preparing `--affected`
- THEN `fetch-depth` MUST be `0`

### Requirement: Vercel Build via Turbo Graph

Each app `vercel.json` MUST install from monorepo root and build with `turbo run build --filter=<app>...`. The API project MUST NOT use manual bundle scripts that copy workspace packages into `node_modules`.

#### Scenario: API Vercel build

- GIVEN `apps/api/vercel.json`
- WHEN the build runs on Vercel
- THEN it MUST use `turbo run build --filter=@hubilee/api...`
- AND MUST NOT invoke `api:bundle` or equivalent manual `cp` of `@hubilee/database`
