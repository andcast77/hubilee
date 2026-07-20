# Exploration: company-registration-otp

## Current State

- `POST /v1/auth/register` crea usuario ± empresa en una transacción; sin OTP ([`auth.service.ts`](../../../packages/api/src/services/auth.service.ts)).
- Rate limit público: `ms-auth-public` en [`rate-limit.plugin.ts`](../../../packages/api/src/plugins/core/rate-limit.plugin.ts).
- [`getRedis()`](../../../packages/api/src/common/cache/redis.ts) puede ser `null` sin env Upstash.
- Hub llama `POST /v1/auth/resend-verification` sin controlador API confirmado.

## Affected Areas

- `packages/api/src/dto/auth.dto.ts`, `services/auth.service.ts`, `controllers/v1/auth.controller.ts`
- Nuevos: servicios OTP, mailer, verificación Turnstile, util ticket
- `apps/hub|workify|pos` registro y `api-client`

## Recommendation

Implementar según [`docs/plans/[completed] PLAN-39-company-registration-otp.md`](../../../docs/plans/%5Bcompleted%5D%20PLAN-39-company-registration-otp.md); Redis para estado efímero; ticket JWT con `jti` one-time.

## Ready for Proposal

Sí — alineado con PLAN-39 y propuesta en `proposal.md`.
