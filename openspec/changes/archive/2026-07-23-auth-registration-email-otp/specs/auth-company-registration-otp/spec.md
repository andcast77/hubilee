# Delta for auth-company-registration-otp

## ADDED Requirements

### Requirement: Pos registration is OTP-only

The Pos webapp MUST complete company registration only via `POST /v1/auth/register/otp/send`, `POST /v1/auth/register/otp/verify` (yielding `registrationTicket`), then `POST /v1/auth/register`. Pos MUST NOT call `register/link/*` for registration. Hub and Hr registration UX MUST remain unchanged (magic link allowed).

#### Scenario: Pos happy path OTP register

- GIVEN a new email on Pos register
- WHEN the user completes OTP send → verify → register with `registrationTicket`
- THEN the account and company SHALL be created and the user authenticated per existing register behavior
- AND Pos MUST NOT request magic-link send or verify

#### Scenario: Hub/Hr still use link register

- GIVEN Hub or Hr registration UI
- WHEN a user registers
- THEN those apps MAY continue using `register/link/*`
- AND this change MUST NOT remove or break link-register API routes

---

### Requirement: Captcha optional when Turnstile secret unset

When `TURNSTILE_SECRET_KEY` is unset or empty and the API is not in production, OTP send MUST skip provider verification (local/dev). When the secret is configured, the API MUST verify the captcha token. In production without a secret, the API MUST reject with a stable captcha-config error. Pos MAY use Turnstile `interaction-only` (often invisible).

#### Scenario: Local send without Turnstile secret

- GIVEN non-production API with empty `TURNSTILE_SECRET_KEY`
- AND a valid email eligible for registration
- WHEN Pos calls OTP send (captcha token may be placeholder or empty per DTO alignment)
- THEN the server MUST accept captcha as skipped and proceed with send limits and email delivery

#### Scenario: Captcha enforced when secret configured

- GIVEN `TURNSTILE_SECRET_KEY` is set
- AND captcha verification fails
- WHEN the client calls OTP send
- THEN the server MUST reject with a stable machine-readable `code` (e.g. `CAPTCHA_FAILED`)

#### Scenario: Production missing Turnstile secret

- GIVEN `NODE_ENV=production` and empty `TURNSTILE_SECRET_KEY`
- WHEN the client calls OTP send
- THEN the server MUST reject with a stable captcha-config error (e.g. `CAPTCHA_NOT_CONFIGURED`)

---

## MODIFIED Requirements

### Requirement: OTP send before company registration

The system SHALL accept a request to send a one-time code to an email address prior to company registration, subject to captcha rules (verify when Turnstile secret is configured; skip when unset in non-production) and rate limits.
(Previously: always required captcha verification with configured provider; no explicit local skip.)

#### Scenario: Successful send

- GIVEN a valid email format (normalized to lowercase on the server)
- AND captcha is satisfied per captcha rules (verified token when secret set; skip when secret unset in non-production)
- AND Redis (or configured store) is available
- AND the send count for this email in the current challenge window is below 3
- WHEN the client calls the OTP send endpoint
- THEN the response SHALL be success with the standard API envelope
- AND the plaintext OTP SHALL NOT appear in the response or in structured logs

#### Scenario: Send blocked — user already exists

- GIVEN a user row already exists for that email
- WHEN the client calls the OTP send endpoint
- THEN the server SHALL reject the request with an error consistent with existing registration policy (e.g. duplicate email message)

#### Scenario: Send blocked — captcha invalid

- GIVEN captcha verification is required (secret configured) and fails
- WHEN the client calls the OTP send endpoint
- THEN the server SHALL reject the request with a stable machine-readable `code` (e.g. `CAPTCHA_FAILED`)

#### Scenario: Send blocked — limit exceeded

- GIVEN the send count for this email in the current challenge window has reached 3
- WHEN the client calls the OTP send endpoint
- THEN the server SHALL reject the request with `429` or domain error with stable `code` (e.g. `OTP_SEND_LIMIT`)

#### Scenario: OTP store unavailable

- GIVEN Redis (or required store) is not configured or unreachable
- WHEN the client calls the OTP send endpoint
- THEN the server SHALL NOT succeed the operation
- AND the response SHALL use a stable error without leaking internal stack traces
