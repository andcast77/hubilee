# pos-webapp-admin-shell Specification

Canonical spec (created from change `pos-webapp-shell-remodel`, archived 2026-07-23).

## Purpose

Pos `/app/*` Spike shell (sidebar+header+content card) via Hubilee tokens. Landing SEO + PWA `/app/` kept. Hub/HR/Tech out.

## Requirements

### Requirement: Light Spike-pattern admin shell on /app

Authenticated Pos `/app/*` MUST render light chrome: sidebar, header, rounded content card. MUST use Hubilee tokens (not Spike brand/pixels). MUST NOT ship dark-mode shell in this change.

#### Scenario: Three chrome regions light

- GIVEN signed-in user opens `/app/*`
- WHEN layout renders
- THEN sidebar, header, and content card are present with light Hubilee Spike chrome
- AND dark-mode shell MUST NOT be default

### Requirement: Shell excludes landing and public auth

`/`, `/login`, `/register` MUST stay outside admin shell. PWA scope MUST remain `/app/` without breaking landing SEO.

#### Scenario: Landing and login outside shell

- GIVEN anonymous user opens `/` or `/login`
- WHEN page renders
- THEN admin shell MUST NOT wrap that page

### Requirement: Pos-only; shared UI additive

Shell MUST apply only to Pos. Hub/HR/Tech MUST NOT change as side effect. `@hubilee/ui` changes MUST be additive; Pos wrappers SHOULD take Spike chrome first.

#### Scenario: Other apps and shared UI safe

- GIVEN this change ships
- WHEN Hub/HR/Tech/`@hubilee/ui` are inspected
- THEN other apps MUST NOT adopt Pos Spike shell; shared UI MUST stay additive

### Requirement: No domain API work for shell

Shell MUST NOT require new REST endpoints or frontend BFF.

#### Scenario: Shell adds no APIs

- GIVEN shell remodel
- WHEN contracts are reviewed
- THEN no new domain endpoints are required

### Requirement: Shell landmark smoke coverage

Pos MUST ship Vitest smoke asserting sidebar, header, content-card landmarks (strict TDD).

#### Scenario: Shell landmarks testable

- GIVEN Vitest shell smoke on representative `/app` layout
- WHEN it runs
- THEN it asserts sidebar, header, and content-card landmarks
