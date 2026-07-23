# Archive Report: auth-registration-email-otp

**Date**: 2026-07-23  
**Mode**: hybrid (OpenSpec filesystem + Engram)  
**Branch tip**: `feature/auth-registration-email-otp-05-cleanup` @ `df73d39`  
**Verify verdict**: PASS WITH WARNINGS (0 CRITICAL)

## Engram observation IDs (traceability)

| Artifact | Topic key | ID |
|----------|-----------|-----|
| proposal | `sdd/auth-registration-email-otp/proposal` | #570 |
| spec | `sdd/auth-registration-email-otp/spec` | #571 |
| design | `sdd/auth-registration-email-otp/design` | #572 |
| tasks | `sdd/auth-registration-email-otp/tasks` | #573 |
| apply-progress | `sdd/auth-registration-email-otp/apply-progress` | #575 |
| verify-report | `sdd/auth-registration-email-otp/verify-report` | #576 |
| archive-report | `sdd/auth-registration-email-otp/archive-report` | (this save) |

## Task completion gate

- openspec `tasks.md`: 17/17 checked (`[x]`)
- Engram tasks #573: all implementation + verify remediation complete
- No unchecked implementation tasks

## Specs synced

| Domain | Action | Details |
|--------|--------|---------|
| `auth-company-registration-otp` | Updated | MODIFIED OTP send (optional captcha); ADDED Pos OTP-only; ADDED captcha-optional when Turnstile unset. Preserved verify/ticket/register/security/abuse requirements. |
| `auth-password-reset-otp` | Created | New main spec copied from change (4 requirements, 8 scenarios) |

## Archive location

`openspec/changes/archive/2026-07-23-auth-registration-email-otp/`

Contents: proposal.md, design.md, tasks.md, verify-report.md, specs/, archive-report.md

Active path `openspec/changes/auth-registration-email-otp/` removed (moved).

## Review receipt note

No Engram `sdd/auth-registration-email-otp/review/*` artifacts existed for this change. Archive proceeded per orchestrator instruction after verify PASS WITH WARNINGS (0 CRITICAL blockers). Not a native Judgment Day / review-gate transaction archive.

## Remaining warnings (non-blocking)

1. PARTIAL — pwreset Redis-null twin of OTP_STORE_UNAVAILABLE
2. PARTIAL — verify+set password without post-reset login proof
3. PARTIAL — observability without requestId assert
4. Rubro `setQueryData` not asserted
5. password-reset-ticket low unit coverage (mocked)
6. Spec «3 sends» vs `OTP_SEND_MAX` config

## SDD cycle

Complete: propose → spec → design → tasks → apply (17/17 + CRITICAL test remediation) → verify (PASS WITH WARNINGS) → archive.
