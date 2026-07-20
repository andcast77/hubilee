# Verify report: baro-turbopack-build

Date: 2026-06-07

## Spec scenarios

| Scenario | Result |
|----------|--------|
| Monorepo build succeeds (Turbopack, no `--webpack`) | PASS — `next build` reports `Next.js 16.2.3 (Turbopack)` |
| Build resolves proxy dependencies | PASS — `lib/auth/client.ts` added; no missing `@/lib/auth/client` |
| AUTH_ENABLED false bypasses edge gate | PASS — unit test + proxy passthrough |
| Login via API | PASS — `auth-form.tsx` uses `authApi.login` → `/v1/auth/login` |
| Session load via baro me | PASS — `account-context.tsx` uses `baroApi.get('/me')` |
| Registration via Hub | PASS — `/register` redirects to `NEXT_PUBLIC_HUB_URL/register` |

## Commands

```bash
pnpm --filter @hubilee/baro test          # 22 files, 146 passed
pnpm turbo run build --filter=@hubilee/baro...  # exit 0, Turbopack, no NFT warnings
cd apps/baro && npx tsc --noEmit -p tsconfig.json   # exit 0
```

## Notes

- **Proxy:** ADR-aligned passthrough; `AppSessionGate` + `/v1/baro/me` enforce session (same as Hub).
- **Client migration:** All `/api/auth/*` fetches replaced; password change uses `POST /v1/auth/password`.
- **DOCX typing:** Query rows fully typed; `@ts-nocheck` removed from `document-render-data.ts`.
- **NFT warning fix:** Removed `node:fs` from descargar App Route (all DOCX types are dynamic); route imports `descarga-catalog` + `descarga-preview` instead of `descarga` barrel (avoids manifest/fs trace). `context-path.ts` + `outputFileTracingIncludes` kept for future static templates.

## Rollback

Revert `apps/baro/package.json` build script to `next build --webpack` and restore upstream `proxy.ts` cookie check if needed (not recommended for hubilee auth).
