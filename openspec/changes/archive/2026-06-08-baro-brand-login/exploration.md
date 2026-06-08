# Exploration: Baro brand login alignment

## Current state

- Baro login used a local `auth-form.tsx` with marketing `globals.css` on the auth route, producing a visually different experience from Shopflow.
- Shopflow uses `views/LoginPage.tsx` + `(auth)/auth-globals.css` + `@multisystem/ui` auth brand primitives (`AuthLayout`, `AuthBrandPanel`, etc.).
- Login API calls already go through `@multisystem/api` per `baro-auth-integration`; validation errors (400) were surfaced poorly when API returned generic `error` strings alongside `message`.

## Risks

- Route-group CSS isolation: marketing styles must not leak into auth shell.
- `@multisystem/ui` must be transpiled in Baro `next.config.ts`.
- MFA and Hub register/forgot-password redirects must remain unchanged in behavior.

## Decision

Mirror Shopflow auth shell structure with Baro-specific brand copy; keep API auth model unchanged.
