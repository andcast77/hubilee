/**
 * CSP-safe HTML bridge for Google OAuth popup display mode.
 * postMessages the Pos opener, then closes the popup.
 */

export type GoogleOAuthBridgeStatus = 'session' | 'mfa' | 'error'

export type GoogleOAuthBridgeMessage = {
  type: 'hubilee:google-oauth'
  v: 1
  status: GoogleOAuthBridgeStatus
  next?: string
  tempToken?: string
  error?: string
}

/** Escape JSON for embedding inside a <script> tag (block XSS via </script>). */
export function escapeJsonForHtmlScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

export function buildGoogleOAuthPopupBridgeHtml(params: {
  nonce: string
  targetOrigin: string
  payload: GoogleOAuthBridgeMessage
}): string {
  const payloadJson = escapeJsonForHtmlScript(params.payload)
  const targetOriginJson = escapeJsonForHtmlScript(params.targetOrigin)
  const nonceAttr = params.nonce.replace(/"/g, '')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>Google OAuth</title>
</head>
<body>
<script nonce="${nonceAttr}">
(function () {
  var payload = ${payloadJson};
  var targetOrigin = ${targetOriginJson};
  try {
    if (window.opener && typeof window.opener.postMessage === 'function') {
      window.opener.postMessage(payload, targetOrigin);
    }
  } catch (e) {}
  try { window.close(); } catch (e) {}
})();
</script>
</body>
</html>`
}
