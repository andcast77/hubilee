# Tasks: POS email OTP (register + password reset)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~900–1300 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 captcha → PR2 reset API → PR3 Pos register → PR4 Pos reset → PR5 cleanup |
| Delivery strategy | ask-on-risk (resolved) |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No (resolved)
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Optional captcha register OTP | PR1 | `pnpm --filter @hubilee/api exec vitest run src/__tests__/unit/registration-otp.service.test.ts` | N/A unit | Revert DTO + captcha call-site |
| 2 | Password-reset OTP API | PR2 | `pnpm --filter @hubilee/api exec vitest run src/__tests__/unit/password-reset-otp.service.test.ts` | Manual send→verify→reset +Redis | Delete password-reset services/routes + bucket |
| 3 | Pos Register OTP cutover | PR3 | `pnpm --filter @hubilee/pos exec vitest run src/views/__tests__/RegisterPage.shell.test.tsx` | Browser `/register` OTP | Revert RegisterPage + shell test |
| 4 | Pos forgot/reset + Login | PR4 | `pnpm --filter @hubilee/pos exec vitest run src/views/__tests__/` | Browser login→forgot→OTP→pw | Remove forgot/reset routes |
| 5 | Verify leftovers + notes | PR5 | `pnpm --filter @hubilee/pos typecheck` | N/A cleanup | Restore verify route |

**Pre-apply:** resolved `feature-branch-chain`. Design defaults: reuse registration-ticket secret; no session revoke; no Prisma token clear.

Specs: `auth-company-registration-otp` · `auth-password-reset-otp`. Threat matrix: N/A.

---

## Phase 1: API optional captcha (TDD)

- [x] 1.1 RED: extend `registration-otp.service.test.ts` — skip unset secret (non-prod); `CAPTCHA_FAILED` when set; `CAPTCHA_NOT_CONFIGURED` prod
- [x] 1.2 GREEN: optional `captchaToken` in `auth.dto.ts`; verify only when secret set — keep link-register API
- [x] 1.3 Align OTP send in `auth.controller.ts`; green unit suite

## Phase 2: API password-reset OTP (TDD)

- [x] 2.1 RED: create `password-reset-otp.service.test.ts` — known send, unknown `sent:true`, 3·3, ticket consume
- [x] 2.2 GREEN: `password-reset-otp.service.ts` — `pwreset:ch:{b64}`, HMAC/`OTP_PEPPER`, same TTL/3·3
- [x] 2.3 GREEN: `password-reset-ticket.service.ts` — purpose `password_reset`, `pwreset:jti:{jti}`
- [x] 2.4 Mailer `sendPasswordResetOtpEmail` + reset DTOs in `auth.dto.ts`
- [x] 2.5 Routes `password-reset/otp/send|verify` + `password-reset`; bucket `ms-auth-password-reset-otp`
- [x] 2.6 No OTP/password/captcha in logs — Observability scenario

## Phase 3: Pos Register OTP

- [x] 3.1 RED: `RegisterPage.shell.test.tsx` — otp send|verify→register; no `register/link/*`
- [x] 3.2 GREEN: `RegisterPage.tsx` form→OTP→register; Turnstile non-blocking; `posEnabled:true`
- [x] 3.3 Expire/redirect Pos register/verify under `app/(public)/`; Hub/Hr link UX untouched

## Phase 4: Pos forgot/reset

- [x] 4.1 RED: shell tests forgot/reset + Login → `/forgot-password`
- [x] 4.2 GREEN: `ForgotPasswordPage` + `ResetPasswordPage` (+ routes) → reset OTP API only
- [x] 4.3 `LoginPage` ¿Olvidaste? → local `/forgot-password`

## Phase 5: Cleanup

- [x] 5.1 Remove Pos magic-link register leftovers
- [x] 5.2 Note: Pos OTP-only; Hub/Hr link kept; reset routes listed

### Delivery notes (5.2)

- **Pos register**: OTP-only (`/register/otp/send|verify` → `/register`); `/register/verify` redirects to `/register`.
- **Hub/Hr**: magic-link register UX and `register/link/*` API unchanged.
- **Pos password reset routes**: `/forgot-password`, `/reset-password` → API `POST /v1/auth/password-reset/otp/send|verify` and `POST /v1/auth/password-reset`.
- **Design defaults applied**: reuse registration-ticket secret; no session revoke on reset; Prisma `passwordResetToken*` untouched.
