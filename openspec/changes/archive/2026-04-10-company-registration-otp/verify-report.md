# Verify report: company-registration-otp

**Date:** 2026-04-10  
**Spec:** [`specs/auth-company-registration-otp/spec.md`](./specs/auth-company-registration-otp/spec.md) (delta; merged to [`openspec/specs/auth-company-registration-otp/spec.md`](../../specs/auth-company-registration-otp/spec.md))

## Automated checks

| Check | Command / evidence |
|--------|---------------------|
| OTP send limit (3) + verify lockout (3) + success path | `packages/api` Vitest `src/__tests__/unit/registration-otp.service.test.ts` |
| Ticket email mismatch, reuse, invalid JWT, JWT claims | `src/__tests__/unit/registration-ticket.service.test.ts` |
| Full API unit suite | `pnpm --filter @hubilee/api run test:unit` |
| Front typecheck | Hub / Workify / Pos `tsc --noEmit` (CI or local) |

## Spec scenario coverage (sdd-verify)

| Requirement / scenario | Covered by |
|------------------------|------------|
| Send limit exceeded → `OTP_SEND_LIMIT` | Unit test `sendRegistrationOtp: rejects after 3 sends` |
| Wrong code increments failures; 3 failures invalidate | Unit test `verifyRegistrationOtp: wrong code... OTP_VERIFY_LOCKOUT` |
| Successful verify → `registrationTicket` | Unit test `success returns registrationTicket` |
| Ticket email mismatch | `verifyAndConsumeRegistrationTicket` unit test |
| Ticket reuse | `REGISTRATION_TICKET_REUSED` unit test |
| Garbage JWT | `REGISTRATION_TICKET_INVALID` unit test |
| Register with company + ticket / DTO | Implemented in `packages/api/src/services/auth.service.ts`; register-without-company unchanged |
| Captcha invalid / user exists / Redis down | Covered by implementation + integration with real deps for full paths; captcha skip in non-prod when secret empty documented in `turnstile.service.ts` |
| Dedicated rate-limit bucket for OTP routes | `packages/api/src/plugins/core/rate-limit.plugin.ts` |
| Front: Hub, Workify, Pos OTP + Turnstile | `RegisterPage` / `RegisterForm` + `@marsidev/react-turnstile` |

## Manual smoke (product)

Prerrequisitos: API con `UPSTASH_*`, email (Resend) y Turnstile en prod; local según `.env`.

1. Levantar API y una app (p. ej. Hub `pnpm dev:hub`).
2. Registro con empresa: completar formulario → captcha → código en email → verificar → cuenta creada.
3. Repetir flujo en Workify y Pos (mismos endpoints API).
4. Opcional: comprobar `resend-verification` post-registro en Hub (flujo distinto del OTP previo).

Marcar en PLAN-39 §11 el ítem de smoke manual cuando se ejecute en un entorno real.
