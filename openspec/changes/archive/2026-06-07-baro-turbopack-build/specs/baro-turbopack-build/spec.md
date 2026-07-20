# Baro Turbopack Build Specification (delta)

## ADDED Requirements

### Requirement: Turbopack production build

Baro MUST build with the default Next.js 16 bundler (Turbopack) without `--webpack`, consistent with other hubilee Next apps.

#### Scenario: Monorepo build succeeds

- GIVEN the hubilee workspace with dependencies built
- WHEN `pnpm turbo run build --filter=@hubilee/baro...` runs
- THEN the Baro build completes without module resolution errors
- AND no `--webpack` flag is used in Baro package scripts

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

Baro client code MUST call `@hubilee/api` auth and baro routes via `lib/api/client.ts`. Baro MUST NOT fetch removed local `/api/auth/*` BFF paths for login, logout, refresh, or `/me`.

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

#### Scenario: Registration via Hub

- GIVEN a visitor on Baro register
- WHEN they open `/register`
- THEN they are redirected to Hub registration URL
- AND Baro does not expose a local register API route

## MODIFIED Requirements

None.

## REMOVED Requirements

None.
