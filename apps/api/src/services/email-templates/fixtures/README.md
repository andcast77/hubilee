# Transactional email HTML fixtures (PLAN-41)

Los mensajes se arman con `buildTransactionalEmailHtml` desde **`@hubilee/ui/email`** y `mailer.service.ts`.

## Vista previa local

1. Tests de especificación: `pnpm --filter @hubilee/ui test` (incluye `src/email/transactional-email-layout.test.ts`).
2. Para ver en el navegador: importar `buildTransactionalEmailHtml` desde `@hubilee/ui/email`, guardar el string en un `.html` y abrirlo.
3. En producción: enviar vía Resend o herramienta de preview; validar al menos un cliente restrictivo (p. ej. Outlook) según PLAN-41.

## Props principales

- `htmlTitle`, `previewText`, `welcomeTitle` + `welcomeSubtitle`, `cardTitle`, `bodyHtml`, `primaryButton` (`label` + `href`), `cardFooterHtml`, `brandLogoUrl`.
- Usar `escapeHtml` / `escapeHtmlAttr` para datos dinámicos en `bodyHtml` y atributos.

## Muestras

- **OTP**: sin `primaryButton`; código destacado.
- **Magic link / verificación**: con `primaryButton` + enlace alternativo en el cuerpo.

Logo opcional: `MAIL_BRAND_LOGO_URL` en la API.
