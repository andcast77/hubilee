# Tasks: Baro Turbopack build + auth alignment

## Phase 1 — SDD artifacts

- [x] 1.1 `exploration.md`
- [x] 1.2 `proposal.md`
- [x] 1.3 `specs/baro-turbopack-build/spec.md`
- [x] 1.4 `design.md`
- [x] 1.5 `tasks.md`

## Phase 2 — Build fix + Turbopack

- [x] 2.1 Add `apps/baro/lib/auth/client.ts` (`isAuthEnabled`)
- [x] 2.2 Refactor `apps/baro/proxy.ts` (ADR/Hub passthrough)
- [x] 2.3 Remove `--webpack` from `apps/baro/package.json`; align `next` + `eslint-config-next` to catalog `16.2.3`
- [x] 2.4 Update `apps/baro/next.config.ts` comments (standalone + Turbopack)

## Phase 3 — Client API migration

- [x] 3.1 Extend `apps/baro/lib/api/client.ts` (`authApi.login`, `logout`, `refresh`)
- [x] 3.2 `account-context.tsx` → `/v1/baro/me` + auth refresh/logout
- [x] 3.3 `auth-form.tsx` login via API; `register/page.tsx` → Hub redirect
- [x] 3.4 `app-session-gate.tsx`, `cuenta-logout-button.tsx`
- [x] 3.5 Professionals: `use-list.ts`, `professional-profile-form.tsx`, `professionals-list.tsx`, `profesionales/client.tsx`

## Phase 4 — Testing & verify

- [x] 4.1 Unit test `lib/auth/client.test.ts`
- [x] 4.2 `pnpm --filter @hubilee/baro test`
- [x] 4.3 `pnpm turbo run build --filter=@hubilee/baro...`
- [x] 4.4 `verify-report.md`

## Follow-ups (out of scope)

- [x] Password change: API `POST /v1/auth/password` + `account-access-card.tsx`
- [x] Test/type fixes: export `InitialData`, professional-profile test, DOCX implicit-any
- [x] Removed `@ts-nocheck` from `document-render-data.ts`
- [x] Full typed DOCX query rows (replace remaining `any` query row types)
- [x] Context path helper (`lib/expediente/context-path.ts`) — no runtime `process.cwd()` in template paths
- [ ] Optional Docker baro image smoke test
- [x] Turbopack NFT warning — removed `fs` from descargar route (all DOCX types are dynamic); split `descarga-preview.ts` + catalog helpers
