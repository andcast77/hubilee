# Tasks: Baro brand login

## 1. SDD

- [x] 1.1 Exploration, proposal, spec delta, design
- [x] 1.2 Verify build and archive

## 2. Baro auth UI

- [x] 2.1 Add `views/LoginPage.tsx` (Shopflow pattern, Baro copy)
- [x] 2.2 Create `(auth)/` route group with `auth-globals.css`
- [x] 2.3 Move marketing pages to `(site)/`
- [x] 2.4 Add `@hubilee/ui`, transpile, types
- [x] 2.5 Remove legacy `auth-form.tsx` and old login routes

## 3. Supporting fixes

- [x] 3.1 API client error message resolution
- [x] 3.2 Prisma adapter selection for seed/client
- [x] 3.3 API errors plugin registration order

## 4. Verify

- [x] 4.1 `pnpm --filter @hubilee/baro build`
