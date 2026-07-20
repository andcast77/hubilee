# Proposal: Registro de empresa con OTP (PLAN-39)

## Intent

Exigir verificación de email por OTP y captcha antes de crear empresa en registro; emitir `registrationTicket` de corta vida y validarlo en `POST /v1/auth/register` cuando hay `companyName`. Reduce abuso y alinea Hub, Workify y Pos al mismo flujo.

## Scope

### In Scope

- API: `POST /v1/auth/register/otp/send`, `POST /v1/auth/register/otp/verify`; extensión de registro con ticket; mailer (SMTP); Turnstile server-side; Redis para OTP hasheado, contadores y `jti` one-time; rate limits dedicados.
- Front: flujo por pasos en Hub, Workify, Pos; variables `NEXT_PUBLIC_*` Turnstile.
- Tests API: límites 3/3, ticket inválido, mismatch email; documentación `.env.example` / README API.
- Decisión documentada para `resend-verification` (implementar / fusionar / deprecar).

### Out of Scope

- Cambiar contrato global de sesión salvo lo necesario para registro.
- Nuevo proveedor de email distinto de capa abstracta + SMTP por defecto.
- E2E browser automatizado (smoke manual en plan).

## Capabilities

### New Capabilities

- `auth-company-registration-otp`: OTP pre-registro, límites, captcha en envío, ticket JWT de registro empresa, integración con `register`.

### Modified Capabilities

- None (no hay `openspec/specs/*/spec.md` previo en repo; comportamiento de auth se describe en delta bajo el cambio).

## Approach

Redis (Upstash) para hash OTP, TTL ~15m, contadores send/fail; HMAC/pepper para hash del código; comparación timing-safe. Turnstile verify en cada `send`. Ticket: JWT (`purpose: company_register`, `jti` consumido en Redis al registrar). Sin Redis: endpoints OTP fallan de forma controlada (503 / código estable). Registro sin `companyName`: sin ticket (comportamiento actual). Email ya existente en `send`: mismo criterio que `register` hoy.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `packages/api` | Modified | DTOs, auth service/controller, rate-limit, env, mailer, tests |
| `apps/hub`, `workify`, `pos` | Modified | Register UI + API client + Turnstile |
| `docs/plans/PLAN-39` | Modified | Checklist §11 durante implementación |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Redis ausente en dev | Med | Documentar; error claro en OTP; CI con Redis o mock |
| Falsos positivos Turnstile | Low | Mensajes de dominio; no loguear token completo |
| Rotura registro legacy | Med | Tests; registro sin empresa sin cambio |

## Rollback Plan

Revertir PR/rama: quitar rutas OTP y campo opcional `registrationTicket`; restaurar `register` sin validación de ticket; quitar dependencias front Turnstile. Datos en Redis TTL expiran solos; tickets JWT caducan.

## Dependencies

- `UPSTASH_*` para OTP en entornos donde aplique; SMTP o proveedor compatible; cuenta Cloudflare Turnstile (site + secret).

## Success Criteria

- [ ] Escenarios de spec (§ delta) verificados por tests o checklist manual acordado.
- [ ] PLAN-39 §11 actualizado con ítems completados según entrega.
- [ ] `pnpm test` / typecheck en paquetes tocados sin regresiones nuevas.
