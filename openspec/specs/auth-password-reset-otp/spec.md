# auth-password-reset-otp Specification

## Purpose

Email OTP password reset for Pos (API + Pos UI). Greenfield: Hub forgot/reset API routes are missing. Hub forgot UI and admin member password reset are out of scope.

## Requirements

### Requirement: Password-reset OTP send

The system MUST accept a public request to email a one-time code for password reset. Captcha MUST follow the same Turnstile rules as registration OTP (verify when secret set; skip when unset in non-production; reject in production if secret missing). Challenges MUST use a distinct Redis namespace (e.g. `pwreset:`) from registration OTP. Send limits MUST mirror registration (`OTP_SEND_MAX`, default 3, per challenge window). Plaintext OTP MUST NOT appear in responses or structured logs.

#### Scenario: Successful send for known user

- GIVEN an email belonging to an active user with a password
- AND captcha rules are satisfied
- AND Redis is available
- WHEN the client calls password-reset OTP send
- THEN the server MUST store an HMAC challenge and send the code by email
- AND the response MUST succeed without returning the code

#### Scenario: Send for unknown email is enumeration-safe

- GIVEN an email with no matching user
- WHEN the client calls password-reset OTP send
- THEN the server MUST NOT reveal whether the email exists
- AND the client-visible outcome SHOULD match a successful send (or an equivalent non-enumerating success)

#### Scenario: Send blocked — limit or store unavailable

- GIVEN send count for the email has reached `OTP_SEND_MAX` (default 3), OR Redis is unavailable
- WHEN the client calls password-reset OTP send
- THEN the server MUST reject with a stable error code (e.g. `OTP_SEND_LIMIT` / `OTP_STORE_UNAVAILABLE`) without leaking internals

---

### Requirement: Password-reset OTP verify and reset credential

The system MUST verify the OTP with constant-time comparison, enforce at most 3 failed attempts per challenge, and on success allow setting a new password for that email (via a short-lived reset ticket consumed on password change, or an equivalent one-shot verify+set flow). After a successful password change, existing sessions for that user SHOULD be invalidated or rotated per project session policy. Wrong codes MUST increment failures; at 3 failures the challenge MUST be invalidated.

#### Scenario: Verify then set new password

- GIVEN a valid password-reset challenge for the email
- WHEN the client submits the correct code and a valid new password (per password policy)
- THEN the user password MUST be updated
- AND the challenge / ticket MUST be consumed (one-time)
- AND the user MUST be able to log in with the new password

#### Scenario: Wrong code or lockout

- GIVEN an active challenge
- WHEN the client submits an incorrect code
- THEN failed attempts MUST increment and the response MUST fail with a stable code (e.g. `INVALID_OTP`)
- AND WHEN failures reach 3, the challenge MUST be deleted and the client MUST restart from send

#### Scenario: Expired or missing challenge

- GIVEN no valid challenge for the email (never sent or TTL expired)
- WHEN the client submits verify or password set
- THEN the server MUST reject with a stable error (e.g. `INVALID_OTP` / expired ticket)

---

### Requirement: Pos password-reset UI

Pos MUST provide a forgot/reset flow: collect email → enter OTP → set new password, calling only the new password-reset OTP API. Pos MUST NOT depend on Hub `/forgot-password` for this flow. Hub forgot UI is out of scope.

#### Scenario: Pos end-to-end reset

- GIVEN a Pos user on login who chooses forgot password
- WHEN they complete email → OTP → new password successfully
- THEN Pos MUST confirm success and allow navigation to login
- AND Pos MUST NOT call missing Hub forgot/reset URL-token endpoints

---

### Requirement: Security and rate limits for reset OTP

The system MUST NOT log OTP plaintext, full captcha tokens, or passwords. Reset OTP routes MUST use dedicated stricter rate-limit buckets (per IP / route) in addition to per-email send limits. Reset MUST NOT create accounts or change membership.

#### Scenario: Observability without secrets

- GIVEN any reset OTP or password-set request
- WHEN logs are written
- THEN they MUST include `requestId` and MUST NOT include OTP, password, or full captcha/ticket secrets
