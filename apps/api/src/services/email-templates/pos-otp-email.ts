/**
 * Correo OTP Pos — estética del login (lienzo #f5f7fb, card redondeada,
 * acento #0085db, casillas blancas) sin panel promocional.
 * Estilos 100% inline (clientes de correo).
 */

const PAGE_BG = '#f5f7fb'
const CARD_BG = '#ffffff'
const CARD_BORDER = '#e2e8f0'
const CARD_RADIUS = '28px'
const ACCENT = '#0085db'
const HEADLINE = '#0f172a'
const SLATE_800 = '#1e293b'
const TEXT = '#64748b'
const MUTED = '#94a3b8'
const CELL_BORDER = '#e2e8f0'
const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
const TABLE_RESET =
  'border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;'
const COLUMN_MAX = '480px'

export function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function preheaderBlock(text: string): string {
  const t = escapeHtml(text).trim()
  if (!t) return ''
  return `<!--[if !mso]><!--><div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${PAGE_BG};opacity:0;">${t}</div><!--<![endif]-->`
}

/** Casillas como `OtpCodeInput` del Pos. */
function otpCodeCells(code: string): string {
  const digits = code.replace(/\D/g, '').slice(0, 6).padEnd(6, '·').split('')
  const cells = digits
    .map(
      (d) => `<td align="center" style="padding:0 5px;background-color:${CARD_BG};">
  <div style="width:44px;height:56px;line-height:56px;text-align:center;font-family:${FONT};font-size:22px;font-weight:700;color:${HEADLINE};background-color:${CARD_BG};border:1px solid ${CELL_BORDER};border-radius:12px;">${escapeHtml(d)}</div>
</td>`,
    )
    .join('')
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="${TABLE_RESET}margin:0 auto;background-color:${CARD_BG};"><tr>${cells}</tr></table>`
}

export type PosOtpEmailKind = 'registration' | 'password-reset'

export type BuildPosOtpEmailHtmlParams = {
  kind: PosOtpEmailKind
  code: string
  brandLogoUrl?: string | null
}

function copyFor(kind: PosOtpEmailKind): {
  htmlTitle: string
  previewText: string
  cardTitle: string
  lead: string
  footnote: string
} {
  if (kind === 'password-reset') {
    return {
      htmlTitle: 'Restablecer contraseña — Hubilee Pos',
      previewText: 'Tu código para restablecer la contraseña',
      cardTitle: 'Restablecé tu contraseña',
      lead: 'Ingresá el código de 6 dígitos en Pos y elegí una contraseña nueva.',
      footnote:
        'Si no pediste restablecer tu contraseña, podés ignorar este mensaje.',
    }
  }
  return {
    htmlTitle: 'Verificá tu email — Hubilee Pos',
    previewText: 'Tu código de verificación para crear la cuenta',
    cardTitle: 'Verificá tu email',
    lead: 'Ingresá el código de 6 dígitos en Pos para continuar con el registro.',
    footnote: 'Si no solicitaste crear una cuenta, ignorá este mensaje.',
  }
}

function brandRow(brandLogoUrl?: string | null): string {
  const logo =
    brandLogoUrl != null && brandLogoUrl.trim() !== ''
      ? `<img src="${escapeHtml(brandLogoUrl.trim())}" alt="" width="32" height="32" style="display:inline-block;vertical-align:middle;width:32px;height:32px;border:0;margin:0 10px 0 0;" />`
      : ''
  return `${logo}<span style="font-family:${FONT};font-size:17px;font-weight:700;letter-spacing:-0.02em;color:${SLATE_800};vertical-align:middle;">Hubilee <span style="color:${ACCENT};">Pos</span></span>`
}

export function buildPosOtpEmailHtml(params: BuildPosOtpEmailHtmlParams): string {
  const copy = copyFor(params.kind)
  const code = params.code.replace(/\D/g, '').slice(0, 6)
  const preview = preheaderBlock(copy.previewText)
  const brand = brandRow(params.brandLogoUrl)

  return `<!DOCTYPE html>
<html lang="es" style="color-scheme:light;background-color:${PAGE_BG};margin:0;padding:0;">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<meta name="x-apple-disable-message-reformatting" content="" />
<title>${escapeHtml(copy.htmlTitle)}</title>
</head>
<body bgcolor="${PAGE_BG}" style="margin:0;padding:0;background-color:${PAGE_BG};color-scheme:light;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
${preview}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${PAGE_BG}" style="${TABLE_RESET}width:100%;background-color:${PAGE_BG};">
  <tr>
    <td align="center" bgcolor="${PAGE_BG}" style="padding:40px 16px;background-color:${PAGE_BG};">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="${TABLE_RESET}max-width:${COLUMN_MAX};width:100%;margin:0 auto;background-color:${PAGE_BG};">
        <tr>
          <td style="padding:0;background-color:${PAGE_BG};">
            <div style="width:100%;box-sizing:border-box;border-radius:${CARD_RADIUS};overflow:hidden;background-color:${CARD_BG};border:1px solid ${CARD_BORDER};">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="${TABLE_RESET}width:100%;background-color:${CARD_BG};">
              <tr>
                <td style="padding:28px 32px 0 32px;background-color:${CARD_BG};">
                  ${brand}
                </td>
              </tr>
              <tr>
                <td style="padding:28px 32px 8px 32px;background-color:${CARD_BG};">
                  <h1 style="margin:0;font-family:${FONT};font-size:26px;font-weight:700;line-height:1.2;color:${HEADLINE};letter-spacing:-0.025em;">
                    ${escapeHtml(copy.cardTitle)}
                  </h1>
                  <p style="margin:10px 0 0 0;font-family:${FONT};font-size:14px;line-height:1.5;color:${TEXT};">
                    ${escapeHtml(copy.lead)}
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding:28px 32px 8px 32px;background-color:${CARD_BG};">
                  <p style="margin:0 0 16px 0;font-family:${FONT};font-size:14px;font-weight:500;color:#475569;">
                    Ingresá el código de 6 dígitos
                  </p>
                  ${otpCodeCells(code)}
                </td>
              </tr>
              <tr>
                <td style="padding:20px 32px 8px 32px;font-family:${FONT};font-size:13px;line-height:1.5;color:${MUTED};text-align:center;background-color:${CARD_BG};">
                  <p style="margin:0;">Válido unos minutos. No lo compartas con nadie.</p>
                </td>
              </tr>
              <tr>
                <td style="padding:24px 32px 32px 32px;font-family:${FONT};font-size:13px;line-height:1.5;color:${TEXT};background-color:${CARD_BG};">
                  <p style="margin:0;color:${MUTED};">${escapeHtml(copy.footnote)}</p>
                </td>
              </tr>
            </table>
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`
}

export function posOtpEmailText(kind: PosOtpEmailKind, code: string): string {
  const digits = code.replace(/\D/g, '').slice(0, 6)
  if (kind === 'password-reset') {
    return `Tu código para restablecer la contraseña es: ${digits}\n\nVálido unos minutos. Si no pediste restablecer tu contraseña, ignorá este mensaje.\n\n— Hubilee Pos`
  }
  return `Tu código de verificación es: ${digits}\n\nIngresalo en Pos para continuar el registro. Válido unos minutos. Si no solicitaste crear una cuenta, ignorá este mensaje.\n\n— Hubilee Pos`
}

export function posOtpEmailSubject(kind: PosOtpEmailKind): string {
  return kind === 'password-reset'
    ? 'Tu código para restablecer la contraseña — Hubilee Pos'
    : 'Tu código de verificación — Hubilee Pos'
}
