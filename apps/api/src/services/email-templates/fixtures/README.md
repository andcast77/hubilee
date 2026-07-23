# Transactional email HTML fixtures (PLAN-41)

## OTP Pos (activo)

Registro y reset usan `buildPosOtpEmailHtml` en
`apps/api/src/services/email-templates/pos-otp-email.ts` (estética login Pos:
lienzo `#f5f7fb`, acento `#0085db`, card redondeada, código en 6 casillas).

Tests: `pnpm --filter @hubilee/api exec vitest run src/__tests__/unit/pos-otp-email.test.ts`

Vista previa: generar HTML con `buildPosOtpEmailHtml({ kind: 'registration', code: '123456' })`,
guardar a `.html` y abrir en el navegador.

## Layout canónico Hub (`@hubilee/ui/email`)

`buildTransactionalEmailHtml` sigue disponible para plantillas Hub (índigo).
Los OTP de Pos no lo usan: el producto Pos pide la estética del login Pos.

Logo opcional: pasar `brandLogoUrl` a `buildPosOtpEmailHtml` cuando exista URL pública.
