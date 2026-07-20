/**
 * Plantilla canónica Hubilee para correos transaccionales.
 * Estilos inline (sin `<style>`, sin clases). Lienzo neutro; card blanco con borde índigo; CTA índigo.
 */

/** Botón primario tipo `AUTH_BRAND_PRIMARY_BUTTON` (relleno índigo). */
export type TransactionalEmailPrimaryButton = {
  label: string
  href: string
}

/**
 * Props del layout de correo (equivalente a pasar props a un componente de UI).
 */
export type TransactionalEmailLayoutProps = {
  /** Contenido de &lt;title&gt; del HTML (no confundir con el asunto del correo). */
  htmlTitle: string
  /** Preheader / vista previa en bandeja (oculto en el cuerpo). */
  previewText?: string
  /**
   * Bloque superior tipo `AuthBrandWelcomeHeader`. Ambos deben definirse para mostrarse.
   */
  welcomeTitle?: string
  welcomeSubtitle?: string
  /** Título dentro del card (equiv. `CardTitle`). */
  cardTitle: string
  /**
   * HTML del cuerpo del card (párrafos, enlaces, etc.). El llamador debe escapar texto
   * no confiable; las URLs en `href` deben pasar por `escapeHtmlAttr`.
   */
  bodyHtml: string
  /** CTA principal opcional (label + href del botón). */
  primaryButton?: TransactionalEmailPrimaryButton
  /**
   * HTML opcional bajo el botón, antes de la firma "— Hubilee"
   * (p. ej. pie `AuthBrandFooterCenter`).
   */
  cardFooterHtml?: string
  /** URL HTTPS opcional del logo (MAIL_BRAND_LOGO_URL). */
  brandLogoUrl?: string | null
}

/** @deprecated Usar `TransactionalEmailLayoutProps`. */
export type TransactionalEmailLayoutOptions = TransactionalEmailLayoutProps

/** Hub `RegisterPage` usa `max-w-lg` → 32rem = 512px */
const COLUMN_MAX = '512px'
/** Lienzo exterior neutro (zinc-100); el cliente puede mostrar su propio fondo encima. */
const PAGE_BG_HEX = '#f4f4f5'
const PAGE_BG = PAGE_BG_HEX
/** Card sólido */
const CARD_BG_HEX = '#ffffff'
const CARD_BG = CARD_BG_HEX
/** Borde exterior del card (indigo-500); sin box-shadow (soporte irregular en correo). */
const CARD_BORDER_HEX = '#6366f1'
const CARD_BORDER_STYLE = `2px solid ${CARD_BORDER_HEX}`
const CARD_INNER_RULE = '#e4e4e7'
/** `rounded-2xl` (~20px), coherente con tokens del Card en UI. */
const CARD_RADIUS = '20px'

const WELCOME_TITLE = '#18181b'
const WELCOME_SUB = '#71717a'
const HEADLINE = '#09090b'
const TEXT = '#3f3f46'
const MUTED = '#71717a'
const LINK = '#4f46e5'
const CTA_BG = '#4f46e5'
const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

/** Escape texto en nodos HTML y atributos genéricos. */
export function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Escape valores en atributos entre comillas dobles (p. ej. `href`). */
export function escapeHtmlAttr(raw: string): string {
  return escapeHtml(raw)
}

function preheaderBlock(text: string): string {
  const t = escapeHtml(text).trim()
  if (!t) return ''
  return `<!--[if !mso]><!--><div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${PAGE_BG};opacity:0;">${t}</div><!--<![endif]-->`
}

const TABLE_RESET =
  'border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;'

/**
 * Genera el documento HTML completo para el cuerpo `html` de Resend u otro proveedor.
 */
export function buildTransactionalEmailHtml(
  props: TransactionalEmailLayoutProps,
): string {
  const title = escapeHtml(props.htmlTitle)
  const cardTitleEscaped = escapeHtml(props.cardTitle)
  const preview = props.previewText ? preheaderBlock(props.previewText) : ''

  const welcomeTitleRaw = props.welcomeTitle?.trim() ?? ''
  const welcomeSubRaw = props.welcomeSubtitle?.trim() ?? ''
  const welcomeBlock =
    welcomeTitleRaw !== '' && welcomeSubRaw !== ''
      ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${PAGE_BG_HEX}" style="${TABLE_RESET}max-width:${COLUMN_MAX};width:100%;margin:0 auto;background-color:${PAGE_BG};">
  <tr>
    <td bgcolor="${PAGE_BG_HEX}" style="padding:0 2px;text-align:left;word-wrap:break-word;overflow-wrap:break-word;-webkit-text-size-adjust:100%;background-color:${PAGE_BG};">
      <h1 style="margin:0;font-family:${FONT};font-size:30px;font-weight:700;line-height:1.2;color:${WELCOME_TITLE};letter-spacing:-0.025em;">
        ${escapeHtml(welcomeTitleRaw)}
      </h1>
    </td>
  </tr>
  <tr>
    <td bgcolor="${PAGE_BG_HEX}" style="padding:8px 2px 0 2px;text-align:left;word-wrap:break-word;overflow-wrap:break-word;-webkit-text-size-adjust:100%;background-color:${PAGE_BG};">
      <p style="margin:0;font-family:${FONT};font-size:15px;line-height:1.5;color:${WELCOME_SUB};">
        ${escapeHtml(welcomeSubRaw)}
      </p>
    </td>
  </tr>
</table>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" bgcolor="${PAGE_BG_HEX}" style="${TABLE_RESET}max-width:${COLUMN_MAX};width:100%;margin:0 auto;background-color:${PAGE_BG};"><tr><td bgcolor="${PAGE_BG_HEX}" style="font-size:32px;line-height:32px;height:32px;background-color:${PAGE_BG};">&nbsp;</td></tr></table>`
      : ''

  const logoBlock =
    props.brandLogoUrl != null && props.brandLogoUrl.trim() !== ''
      ? `<tr>
 <td style="padding:0 0 16px 0;text-align:center;background-color:${CARD_BG};">
    <img src="${escapeHtmlAttr(props.brandLogoUrl.trim())}" alt="Hubilee" width="140" style="display:block;margin:0 auto;max-width:140px;width:140px;height:auto;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;" />
  </td>
</tr>`
      : ''

  const btn = props.primaryButton
  const ctaInner =
    btn != null
      ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="${TABLE_RESET}margin:0 auto;width:100%;background-color:${CARD_BG};">
  <tr>
    <td align="center" style="padding:0 0 8px 0;background-color:${CARD_BG};">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="${TABLE_RESET}width:100%;max-width:100%;background-color:${CARD_BG};">
        <tr>
          <td align="center" bgcolor="${CTA_BG}" style="background-color:${CTA_BG};border-radius:12px;mso-padding-alt:16px 18px;">
            <a href="${escapeHtmlAttr(btn.href)}" style="display:block;padding:16px 18px;min-height:48px;box-sizing:border-box;font-family:${FONT};font-size:16px;font-weight:600;line-height:1.35;color:#ffffff;text-decoration:none;border-radius:12px;text-align:center;-webkit-tap-highlight-color:transparent;">
              ${escapeHtml(btn.label)}
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`
      : ''

  const cardFooter = props.cardFooterHtml?.trim()
    ? `<tr>
  <td style="padding:28px 28px 8px 28px;text-align:center;font-family:${FONT};word-wrap:break-word;overflow-wrap:break-word;-webkit-text-size-adjust:100%;background-color:${CARD_BG};">
    ${props.cardFooterHtml}
  </td>
</tr>`
    : ''

  return `<!DOCTYPE html>
<html lang="es" style="color-scheme:light;background-color:${PAGE_BG};margin:0;padding:0;">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<meta name="x-apple-disable-message-reformatting" content="" />
<title>${title}</title>
</head>
<body bgcolor="${PAGE_BG_HEX}" style="margin:0;padding:0;background-color:${PAGE_BG};color-scheme:light;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;word-wrap:break-word;">
${preview}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${PAGE_BG_HEX}" style="${TABLE_RESET}width:100%;max-width:100%;background-color:${PAGE_BG};">
  <tr>
    <td align="center" bgcolor="${PAGE_BG_HEX}" style="padding:28px 16px;background-color:${PAGE_BG};width:100%;">
      ${welcomeBlock}
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${PAGE_BG_HEX}" style="${TABLE_RESET}max-width:${COLUMN_MAX};width:100%;margin:0 auto;border-spacing:0;background-color:${PAGE_BG};">
        <tr>
          <td style="padding:0;background-color:${PAGE_BG};">
            <div style="width:100%;max-width:100%;box-sizing:border-box;border-radius:${CARD_RADIUS};overflow:hidden;background-color:${CARD_BG};border:${CARD_BORDER_STYLE};-webkit-border-radius:${CARD_RADIUS};">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="${TABLE_RESET}width:100%;background-color:${CARD_BG};">
              <tr>
                <td style="padding:28px 28px 26px 28px;border-bottom:1px solid ${CARD_INNER_RULE};background-color:${CARD_BG};">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="${TABLE_RESET}width:100%;background-color:${CARD_BG};">
                    ${logoBlock}
                    <tr>
                      <td style="text-align:left;background-color:${CARD_BG};">
                        <h2 style="margin:0;font-family:${FONT};font-size:22px;font-weight:600;line-height:1.25;color:${HEADLINE};letter-spacing:-0.025em;">
                          ${cardTitleEscaped}
                        </h2>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:26px 28px 18px 28px;font-family:${FONT};font-size:15px;line-height:1.55;color:${TEXT};text-align:left;word-wrap:break-word;overflow-wrap:break-word;-webkit-text-size-adjust:100%;background-color:${CARD_BG};">
                  ${props.bodyHtml}
                </td>
              </tr>
              ${
                ctaInner !== ''
                  ? `<tr><td style="padding:12px 28px 14px 28px;background-color:${CARD_BG};">${ctaInner}</td></tr>`
                  : ''
              }
              ${cardFooter}
              <tr>
                <td style="padding:26px 28px 28px 28px;font-family:${FONT};font-size:12px;line-height:1.5;color:${MUTED};border-top:1px solid ${CARD_INNER_RULE};text-align:center;word-wrap:break-word;overflow-wrap:break-word;-webkit-text-size-adjust:100%;background-color:${CARD_BG};">
                  <p style="margin:0;">— Hubilee</p>
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

/** Color de enlaces en el cuerpo (indigo-600, legible sobre card claro). */
export const TRANSACTIONAL_EMAIL_LINK_COLOR = LINK
