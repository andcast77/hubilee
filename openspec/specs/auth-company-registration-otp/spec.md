# Auth: company registration OTP

Canonical spec (merged from change `company-registration-otp`, updated by `auth-registration-email-otp`). See PLAN-39 and API implementation.

### Requirement: OTP send before company registration

The system SHALL accept a request to send a one-time code to an email address prior to company registration, subject to captcha rules (verify when Turnstile secret is configured; skip when unset in non-production) and rate limits.

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

---

### Requirement: OTP verify and registration ticket

The system SHALL verify the OTP with constant-time comparison, enforce at most 3 failed attempts per challenge cycle, and issue a short-lived `registrationTicket` when the code is valid.

#### Scenario: Successful verify

- **Given** a valid challenge exists for the email with matching OTP hash
- **And** failed attempt count is less than 3
- **When** the client submits the correct code
- **Then** the response SHALL include a `registrationTicket` string
- **And** the ticket SHALL bind the normalized email and purpose `company_register`

#### Scenario: Wrong code

- **Given** the submitted code does not match
- **When** the client submits verification
- **Then** the failed attempt counter SHALL increment
- **And** the response SHALL indicate failure without revealing whether the email exists in the challenge store beyond this flow

#### Scenario: Too many failed attempts

- **Given** failed attempts reach 3 for the current challenge
- **When** the client submits verification (correct or not)
- **Then** the challenge SHALL be invalidated
- **And** the client MUST start again from OTP send

---

### Requirement: Register with company requires ticket

For requests that include a non-empty `companyName`, the system SHALL require a valid `registrationTicket` whose email matches the registration body before creating `User` and `Company` rows.

#### Scenario: Register company with valid ticket

- **Given** `companyName` is non-empty
- **And** `registrationTicket` is present, signature valid, not expired, purpose `company_register`, email matches registration email
- **And** `jti` one-time use is implemented and not yet consumed
- **When** `POST /v1/auth/register` is processed
- **Then** registration SHALL proceed as today (transaction, modules, session behavior)

#### Scenario: Register company without ticket

- **Given** `companyName` is non-empty
- **And** `registrationTicket` is missing or invalid
- **When** `POST /v1/auth/register` is processed
- **Then** the server SHALL reject the request with a stable error code

#### Scenario: Register without company unchanged

- **Given** `companyName` is absent or empty
- **When** `POST /v1/auth/register` is processed
- **Then** the server SHALL NOT require `registrationTicket` (behavior aligned with pre-change registration without company)

---

### Requirement: Security and observability

The system MUST NOT log OTP plaintext, full captcha tokens, passwords, or full JWT tickets. Each request MUST remain traceable with `requestId` in logs for OTP and register steps per project observability rules.

---

### Requirement: Abuse controls

OTP endpoints SHALL have dedicated stricter rate-limit buckets (e.g. per IP / route) in addition to application-level send limits per email.

---

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
