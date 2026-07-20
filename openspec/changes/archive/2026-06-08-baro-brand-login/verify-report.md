# Verify report: Baro brand login

**Change:** `baro-brand-login`  
**Date:** 2026-06-08

## Spec scenarios

| Scenario | Result | Evidence |
|----------|--------|----------|
| Login page visual parity | PASS | `(auth)/layout.tsx` + `auth-globals.css`; `LoginPage.tsx` uses `@hubilee/ui` AuthLayout/brand |
| Login submits via API | PASS | `LoginPage` calls API via `lib/api/client.ts`; `api-client.ts` resolves validation `message` |
| Register redirects to Hub | PASS | `(auth)/register/page.tsx` redirects to Hub URL |

## Commands

```bash
pnpm --filter @hubilee/baro build
```

**Result:** PASS (Turbopack production build)

## Manual notes

- Baro and Shopflow auth shells share the same CSS class pattern (`shopflow-auth-shell` rules in Baro `auth-globals.css`).
- Docker Baro on `:3006` and Shopflow on `:3002` verified during session.

## Gaps

- No automated visual regression test (e2e not available per `openspec/config.yaml`).
