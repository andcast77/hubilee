# Proposal: Baro Turbopack build + auth client alignment

## Intent

Restore a **green Baro production build** with **Turbopack** (default Next 16 bundler, matching hub/shopflow/workify) and align edge auth + client fetch paths with hubilee API session model (`baro-auth-integration`, ADR-auth-token-storage).

## Scope

### In Scope

- Add `apps/baro/lib/auth/client.ts` with edge-safe `isAuthEnabled()` helper
- Refactor `apps/baro/proxy.ts` to Hub/ADR pattern (no unreadable API cookie checks)
- Remove `--webpack` from Baro build scripts; align `next` / `eslint-config-next` to pnpm catalog `16.2.3`
- Migrate client `fetch('/api/auth/*')` calls to `@hubilee/api` via `lib/api/client.ts` (`/v1/auth/*`, `/v1/baro/*`)
- Register page: redirect to Hub per `baro-auth-integration`
- Unit test for `isAuthEnabled()`
- Verify `pnpm turbo run build --filter=@hubilee/baro...`

### Out of Scope

- `@hubilee/balance` scaffold
- API password-change endpoint (`/api/auth/password` remains broken until API exists)
- Baro full catalog/eslint/typescript alignment
- Docker image rebuild for baro (optional manual verify)

## Capabilities

### New Capabilities

- `baro-turbopack-build`: Baro builds with default Turbopack; proxy and client auth paths match hubilee API model

### Modified Capabilities

- None at canonical spec level (implements existing `baro-auth-integration` requirements)

## Approach

Single SDD change, one apply slice:

1. SDD artifacts (this change)
2. Proxy + `lib/auth/client.ts`
3. Remove webpack; catalog `next`
4. Rewire client auth/baro fetches
5. Test + build verify

## Affected Areas

| Area | Impact |
|------|--------|
| `apps/baro/proxy.ts` | Modified — ADR-aligned passthrough |
| `apps/baro/lib/auth/client.ts` | New |
| `apps/baro/lib/api/client.ts` | Modified — auth helpers |
| `apps/baro/components/**` | Modified — API URLs |
| `apps/baro/package.json`, `next.config.ts` | Modified — Turbopack default |
| `apps/baro/tests/unit/lib/auth/` | New — unit test |

## Rollback

- Re-add `"build": "next build --webpack"` in `apps/baro/package.json`
- Restore previous `proxy.ts` only if `lib/auth/client.ts` is kept compatible
- Client fetch URLs revert independently

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Turbopack monorepo regression | Low | Same tracing config as other apps; run build |
| Cross-origin session | Med | CORS + `credentials: 'include'` already used by shared ApiClient |
