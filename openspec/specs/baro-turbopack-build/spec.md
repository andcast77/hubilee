# Baro Turbopack Build Specification

Canonical spec (merged from change `baro-turbopack-build`, 2026-06-07). See `apps/baro/next.config.ts`, `apps/baro/proxy.ts`, and `apps/baro/lib/api/client.ts`.

## Purpose

Baro MUST build with Next.js 16 Turbopack (no `--webpack`), use API-backed client auth (no local `/api/auth/*` BFF), and enforce session via client gate + `/v1/baro/me` — not edge cookie reads on the Baro origin.

## Requirements

### Requirement: Turbopack production build

Baro MUST build with the default Next.js 16 bundler (Turbopack) without `--webpack`, consistent with other hubilee Next apps.

#### Scenario: Monorepo build succeeds

- GIVEN the hubilee workspace with dependencies built
- WHEN `pnpm turbo run build --filter=@hubilee/baro...` runs
- THEN the Baro build completes without module resolution errors
- AND no `--webpack` flag is used in Baro package scripts
- AND the build MUST NOT emit Turbopack NFT warnings caused by App Route filesystem tracing

### Requirement: Edge proxy without API cookie reads

Baro `proxy.ts` MUST NOT depend on reading `ms_session` from the Baro origin. When `AUTH_ENABLED` is true, route protection for authenticated areas MUST be enforced client-side via session validation against the API.

#### Scenario: Build resolves proxy dependencies

- GIVEN `apps/baro/proxy.ts` is compiled
- WHEN the production build runs
- THEN all imports from `@/lib/auth/client` resolve
- AND no reference to a non-existent auth client module remains

#### Scenario: AUTH_ENABLED false bypasses edge gate

- GIVEN `AUTH_ENABLED` is not `true`
- WHEN any route is requested
- THEN the proxy allows the request through without redirect

### Requirement: Client auth uses API endpoints

Baro client code MUST call `@hubilee/api` auth and baro routes via `lib/api/client.ts`. Baro MUST NOT fetch removed local `/api/auth/*` BFF paths for login, logout, refresh, session load, or password change.

#### Scenario: Login via API

- GIVEN valid credentials
- WHEN the user submits the login form
- THEN Baro calls `POST /v1/auth/login` on the configured API base URL with `credentials: 'include'`
- AND no request is sent to `/api/auth/login` on the Baro origin

#### Scenario: Session load via baro me

- GIVEN an authenticated API session (cookies on API host)
- WHEN `AccountProvider` loads the account
- THEN it calls `GET /v1/baro/me` with credentials
- AND maps the API envelope to user/profile state

#### Scenario: Password change via API

- GIVEN an authenticated user on the account settings page
- WHEN the user submits a password change
- THEN Baro calls `POST /v1/auth/password` on the API with credentials
- AND no request is sent to a Baro-local password route

#### Scenario: Registration via Hub

- GIVEN a visitor on Baro register
- WHEN they open `/register`
- THEN they are redirected to Hub registration URL
- AND Baro does not expose a local register API route

### Requirement: DOCX download route without filesystem NFT trace

The expediente DOCX download App Route MUST use dynamic renderers only (all registered DOCX types are dynamic). The route MUST NOT import `node:fs` or the server `descarga` barrel that pulls manifest/filesystem helpers, so Turbopack NFT tracing stays bounded.

#### Scenario: Build without NFT warning

- GIVEN Baro production build with Turbopack
- WHEN the build traces the download App Route
- THEN no NFT warning is emitted for `next.config.ts` or whole-project tracing
- AND dynamic DOCX renderers continue to serve downloads
