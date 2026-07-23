# Proposal: POS email OTP (register + password reset)

**Change ID**: `auth-registration-email-otp` (kept; scope widened)

## Intent

**Pos only:** OTP for company registration (replace magic link) and OTP for password reset. Hub/Hr register stay on magic link.

## Product locks

- POS-only UI; Hub/Hr register unchanged.
- Registration: OTP-only on Pos; Pos stops `register/link/*`.
- Password reset: OTP in scope (API + Pos UI).
- Turnstile: non-blocking when API secret unset.

## Turnstile — finding

Pos has `RegistrationTurnstile` (`interaction-only` → often invisible; test key fallback). API skips verify if `TURNSTILE_SECRET_KEY` empty (non-prod); prod requires it. OTP DTO still requires `captchaToken`.

**Stance:** Keep when secret set; omit when skip applies; no visible-captcha goal.

## Password reset — finding

Pos “¿Olvidaste?” → Hub `/forgot-password`. Hub calls forgot/reset with URL token, but **API routes missing** (only Prisma `passwordResetToken*`) → greenfield OTP. Admin member reset in Pos = out of scope.

## Scope

### In Scope

- Pos register via `register/otp/*` + ticket + `register`; drop Pos link UI.
- Leave link API for Hub/Hr.
- New reset-OTP API + Pos UI (email → code → new password).
- Mailer + Redis HMAC / 3·3 / TTL; captcha optional when unset; Pos tests.

### Out of Scope

- Hub/Hr register or Hub forgot UI; deleting link-register API; OAuth; verify-email; MFA; floor; admin member reset.

## Capabilities

### New Capabilities

- `auth-password-reset-otp`: email OTP password reset (API + Pos).

### Modified Capabilities

- `auth-company-registration-otp`: Pos OTP-only; captcha when Turnstile configured.

## Approach

Reuse `register/otp/*`. Add `pwreset:` Redis OTP routes. Captcha only when secret set. Pos magic-link leftovers expire via TTL.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/pos` | Modified/New | OTP register + forgot/reset |
| `apps/api` | Modified/New | reset OTP + captcha align |
| Link register API | Unchanged | Hub/Hr |
| Specs | New+Modified | reset + registration OTP |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Pos OTP / Hub link dual path | Med | Document; unify later |
| Dead Hub reset vs new OTP API | Med | Ship Pos first |
| Invisible Turnstile confuses QA | Low | Document interaction-only |

## Rollback Plan

Revert Pos to link register; disable reset OTP; Redis TTL. No Postgres rollback required.

## Dependencies

Redis, mailer, `OTP_PEPPER`; Turnstile secret for prod only.

## Success Criteria

- [ ] Pos register OTP-only.
- [ ] Pos reset: email → OTP → new password.
- [ ] Local works without Turnstile secret; prod can enforce.
- [ ] Hub/Hr register unchanged.

## Locked assumptions

Pos-only; OTP register on Pos; reset OTP in scope; captcha non-blocking when unset; keep change id.
