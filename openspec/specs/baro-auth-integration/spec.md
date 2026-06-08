# Baro Auth Integration Specification

Canonical spec (merged from change `check-structure`). See `apps/baro/lib/api/client.ts` and `@multisystem/api` auth routes.

## Purpose

Baro MUST use the same authentication and session model as other multisystem product apps via `@multisystem/api` — no standalone baro auth tables or JWT implementation.

## Requirements

### Requirement: API-Based Authentication

Baro MUST authenticate users through `@multisystem/api` auth endpoints. Baro MUST NOT implement local login, register, refresh, or password BFF routes on the Baro origin; client flows MUST call `/v1/auth/*` and `/v1/baro/me` via `lib/api/client.ts`.

#### Scenario: Login via API

- GIVEN valid credentials for a multisystem user
- WHEN the user logs in through baro
- THEN baro calls the API auth endpoint
- AND stores the session using shared httpOnly cookies (`ms_session`)
- AND no baro-local auth handler processes the request

#### Scenario: Unauthenticated access blocked

- GIVEN no valid session cookie
- WHEN accessing baro protected routes
- THEN the user is redirected to login
- AND API returns 401 for protected data calls

#### Scenario: Password change via API

- GIVEN an authenticated baro user
- WHEN changing password from account settings
- THEN baro calls `POST /v1/auth/password` on the API
- AND no baro-local password handler processes the request

### Requirement: No Standalone Auth Tables

Baro-specific `User` and `RefreshToken` models MUST NOT exist in the database after migration.

#### Scenario: Schema inspection

- GIVEN the merged `@multisystem/database` schema
- WHEN inspecting auth-related models
- THEN only multisystem `User`, `Session`, and related auth models exist
- AND no baro-specific user or refresh token tables remain

### Requirement: Module Access Control

Baro features MUST require the `baro` module to be enabled for the company (and member where applicable).

#### Scenario: Module disabled

- GIVEN company X with `baro` module disabled for the member
- WHEN an authenticated member accesses baro API routes
- THEN the system returns 403
- AND no baro domain data is returned

#### Scenario: Module enabled

- GIVEN company X with `baro` module enabled for the member
- WHEN accessing baro features
- THEN requests succeed subject to RBAC

### Requirement: Legacy User Migration

Existing baro standalone users MUST be migratable to multisystem `User` + `Company` + `CompanyMember` without data loss of domain records.

#### Scenario: Migrated user login

- GIVEN a baro user migrated to multisystem auth
- WHEN logging in with the same email via API auth
- THEN authentication succeeds
- AND previously owned expedientes are accessible under the mapped company

### Requirement: Registration via Hub

New baro tenants MUST register through the Hub company registration flow, not baro-local register routes.

#### Scenario: New user from baro

- GIVEN an unauthenticated visitor on baro
- WHEN they choose to register
- THEN they are directed to Hub registration
- AND upon completion they receive a Company with the `baro` module available per Hub/module configuration

### Requirement: Branded login shell

Baro login MUST use the shared multisystem auth shell pattern: `@multisystem/ui` auth layout/brand components, isolated auth-route CSS (no marketing `globals.css` on login), and a `views/LoginPage.tsx` view matching the Shopflow login structure (MFA step, Zod validation, Hub links for register/forgot password).

#### Scenario: Login page visual parity

- GIVEN an unauthenticated visitor on `/login`
- WHEN the page renders
- THEN Baro uses `AuthLayout` and auth brand components from `@multisystem/ui`
- AND auth-route styles come from `(auth)/auth-globals.css` only
- AND marketing site styles from `(site)/globals.css` do not apply to the login route

#### Scenario: Login submits via API

- GIVEN valid credentials entered on Baro login
- WHEN the user submits the form
- THEN Baro calls `POST /v1/auth/login` via `lib/api/client.ts`
- AND validation errors from the API display the server `message` when present

#### Scenario: Register redirects to Hub

- GIVEN an unauthenticated visitor on Baro register route
- WHEN they open register
- THEN they are redirected to Hub registration URL
- AND no baro-local register form is shown
