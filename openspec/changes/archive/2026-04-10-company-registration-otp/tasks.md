# Tasks: company-registration-otp

Alineado con [`docs/plans/[completed] PLAN-39-company-registration-otp.md`](../../../../docs/plans/%5Bcompleted%5D%20PLAN-39-company-registration-otp.md) §11 y [`design.md`](./design.md).

**Estado:** completado y archivado en `openspec/changes/archive/2026-04-10-company-registration-otp/`. Spec canónica: [`openspec/specs/auth-company-registration-otp/spec.md`](../../specs/auth-company-registration-otp/spec.md).

## Phase 1: Infrastructure / config

- [x] 1.1 Añadir variables a `env.plugin.ts`, `getConfig()` y `.env.example` (Turnstile, correo transaccional, pepper/ticket, TTL si aplica).
- [x] 1.2 Envío de correo en `@hubilee/api` vía Resend; sin SMTP en apps.

## Phase 2: Core API

- [x] 2.1 `mailer` service (envío texto/HTML mínimo para código OTP).
- [x] 2.2 `turnstile.service` (POST siteverify Cloudflare).
- [x] 2.3 `registration-ticket` (sign/verify JWT, consumo `jti` en Redis).
- [x] 2.4 `registration-otp.service`: send (hash, send limit 3), verify (timing-safe, fail limit 3), invalidación.
- [x] 2.5 DTOs Zod: `otpSendBody`, `otpVerifyBody`, extender `registerBodySchema` con `registrationTicket` condicional.
- [x] 2.6 Controller + rutas: `POST /v1/auth/register/otp/send`, `POST /v1/auth/register/otp/verify`; ampliar `register`.
- [x] 2.7 `auth.service.register`: validar ticket si `companyName` presente; consumir `jti`.
- [x] 2.8 `rate-limit.plugin.ts`: buckets dedicados OTP + `isAuthPublicPath` / paths nuevos.
- [x] 2.9 Documentar README API variables.

## Phase 3: Frontend

- [x] 3.1 Hub: `RegisterPage` + `api-client` (send/verify/register con ticket); widget Turnstile.
- [x] 3.2 Workify: mismo flujo.
- [x] 3.3 Shopflow: mismo flujo.
- [x] 3.4 `NEXT_PUBLIC_*` Turnstile por app.

## Phase 4: Post-registro / deuda Hub

- [x] 4.1 Decisión §8 PLAN-39: implementar `resend-verification`, ajustar UI, o deprecar llamadas — documentar en propuesta/README.

## Phase 5: Testing / verify

- [x] 5.1 Tests unit/integration: límites send/verify, ticket inválido, email mismatch, registro sin empresa sin ticket.
- [x] 5.2 `pnpm typecheck` / `pnpm test` en alcance del cambio.
- [x] 5.3 `sdd-verify`: contrastar con [`specs/auth-company-registration-otp/spec.md`](./specs/auth-company-registration-otp/spec.md) — ver [`verify-report.md`](./verify-report.md).

## Phase 6: Plan / SDD

- [x] 6.1 Actualizar checklist §11 en `PLAN-39` según avance.
- [x] 6.2 Tras verificación: `sdd-archive` — spec fusionada a `openspec/specs/`; carpeta movida a `openspec/changes/archive/2026-04-10-company-registration-otp/`.
