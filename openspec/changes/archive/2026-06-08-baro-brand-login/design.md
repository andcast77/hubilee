# Design: Baro brand login

## Route structure

```
apps/baro/app/
  layout.tsx              # minimal root body (antialiased, no marketing bg)
  (auth)/
    layout.tsx            # auth shell only
    auth-globals.css      # pos-auth-shell rules (copied pattern)
    login/page.tsx        # Suspense + LoginPage
    register/page.tsx     # Hub redirect
  (site)/
    layout.tsx            # imports globals.css
    page.tsx              # marketing home
  (protected)/
    layout.tsx            # imports globals.css for dashboard
```

## Login view

- `views/LoginPage.tsx` — client component; `loginSchema` with `email.trim()`; MFA step; uses `@hubilee/ui` auth primitives.
- `lib/landingUrls.ts` — Hub register/forgot-password URLs from env.

## Shared client

- `packages/shared/src/api-client.ts` — `resolveApiErrorMessage()` prefers `message` when `error` is a generic HTTP phrase or when `code` is set.

## Database adapter

- `packages/database/src/adapter-selection.ts` — `usePgAdapter(url)` for local/Docker Postgres vs Neon in seed and client.

## API plugin order

- `errorsPlugin` registered before `rateLimitPlugin` so rate-limit responses use the standard envelope.
