# Proposal: Baro brand login (Shopflow auth shell)

## Intent

Align Baro login UI and auth-route styling with the Shopflow auth template (`@multisystem/ui` brand shell) while preserving Baro-specific copy and existing API-backed session model.

## Scope

### In scope

- Replace `components/auth-form.tsx` with `views/LoginPage.tsx` (Shopflow pattern)
- Auth route group `(auth)/` with isolated `auth-globals.css`
- Move marketing home to `(site)/` with existing `globals.css`
- Add `@multisystem/ui` dependency and transpile in Next config
- Improve `@multisystem/shared` API client error message resolution for validation responses
- Prisma adapter selection helper for seed/client (Docker/local Postgres vs Neon)
- Register API `errorsPlugin` before rate limit for consistent error envelopes

### Out of scope

- `@multisystem/balance` scaffold
- New API auth endpoints
- Baro dashboard visual redesign

## Capabilities

### Modified capabilities

- `baro-auth-integration`: add branded login shell requirement (UI parity with multisystem auth pattern)

## Rollback

Revert Baro `(auth)` route group and restore `auth-form.tsx`; remove `@multisystem/ui` from Baro if unused elsewhere.
