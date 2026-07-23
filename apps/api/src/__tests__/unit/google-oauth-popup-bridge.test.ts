/**
 * Google OAuth popup bridge HTML helper (CSP nonce + XSS-safe JSON).
 */
import { describe, expect, it } from 'vitest'
import {
  buildGoogleOAuthPopupBridgeHtml,
  escapeJsonForHtmlScript,
} from '../../lib/google-oauth-popup-bridge.js'

describe('escapeJsonForHtmlScript', () => {
  it('escapes HTML-breaking characters in JSON', () => {
    const escaped = escapeJsonForHtmlScript({
      next: '</script><img src=x onerror=alert(1)>',
      error: 'a&b',
    })
    expect(escaped).not.toContain('</script>')
    expect(escaped).toContain('\\u003c')
    expect(escaped).toContain('\\u003e')
    expect(escaped).toContain('\\u0026')
  })
})

describe('buildGoogleOAuthPopupBridgeHtml', () => {
  it('includes nonce attribute and postMessage payload without tokens', () => {
    const html = buildGoogleOAuthPopupBridgeHtml({
      nonce: 'test-nonce-abc',
      targetOrigin: 'http://localhost:3002',
      payload: {
        type: 'hubilee:google-oauth',
        v: 1,
        status: 'session',
        next: '/dashboard',
      },
    })
    expect(html).toContain('nonce="test-nonce-abc"')
    expect(html).toContain('postMessage')
    expect(html).toContain('hubilee:google-oauth')
    expect(html).toContain('"status":"session"')
    expect(html).toContain('"next":"/dashboard"')
    expect(html).not.toContain('accessToken')
    expect(html).not.toContain('refreshToken')
    expect(html).toContain(escapeJsonForHtmlScript('http://localhost:3002'))
  })

  it('escapes hostile returnOrigin / error in script body', () => {
    const evilOrigin = 'http://evil.example/</script><script>alert(1)'
    const html = buildGoogleOAuthPopupBridgeHtml({
      nonce: 'n1',
      targetOrigin: evilOrigin,
      payload: {
        type: 'hubilee:google-oauth',
        v: 1,
        status: 'error',
        error: '</script><script>alert(2)',
      },
    })
    // Raw closing script tags must not appear unescaped in the body.
    const scriptBodies = html.match(/<script[^>]*>([\s\S]*?)<\/script>/g) ?? []
    expect(scriptBodies).toHaveLength(1)
    const body = scriptBodies[0]!
    expect(body).not.toMatch(/<\/script><script>/i)
    expect(body).toContain('\\u003c')
  })
})
