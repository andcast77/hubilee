# Tasks: transactional-email-brand-layout

## 1. Implementation

- [x] 1.1 Add `transactional-email-layout.ts` (`buildTransactionalEmailHtml`, escapes).
- [x] 1.2 Add `MAIL_BRAND_LOGO_URL` to `AppConfig` + `.env.example`.
- [x] 1.3 Wire three mailer functions to the layout; preserve/plaintext URLs.
- [x] 1.4 Unit tests for layout (escape, CTA href, tokens, logo).

## 2. Verification

- [x] 2.1 `pnpm --filter @hubilee/api test` — layout + existing suites.
- [ ] 2.2 Manual: open HTML in Outlook or webmail (operator checklist / PLAN-41).

## 3. Docs

- [x] 3.1 Fixtures README for local HTML preview guidance.
- [x] 3.2 `verify-report.md` after CI-equivalent test run.
