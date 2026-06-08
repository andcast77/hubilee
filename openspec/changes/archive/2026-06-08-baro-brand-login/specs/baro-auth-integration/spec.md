# Delta: baro-auth-integration — branded login shell

## ADDED Requirements

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
