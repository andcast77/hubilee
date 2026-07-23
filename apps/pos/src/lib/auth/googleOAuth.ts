import { API_URL } from '@/lib/api/client'
import { isDesktop } from '@/lib/platform'

export const GOOGLE_OAUTH_MESSAGE_TYPE = 'hubilee:google-oauth' as const
export const GOOGLE_OAUTH_MESSAGE_VERSION = 1 as const
export const GOOGLE_OAUTH_POPUP_NAME = 'hubilee_google_oauth'
export const GOOGLE_OAUTH_POPUP_FEATURES = 'popup=yes,width=500,height=700'
/** ~10 minutes — aligned with API OAuth state TTL. */
export const GOOGLE_OAUTH_POPUP_TIMEOUT_MS = 10 * 60 * 1000

export type GoogleOAuthBridgeMessage = {
  type: typeof GOOGLE_OAUTH_MESSAGE_TYPE
  v: typeof GOOGLE_OAUTH_MESSAGE_VERSION
  status: 'session' | 'mfa' | 'error'
  next?: string
  tempToken?: string
  error?: string
}

export type GoogleOAuthPopupResult =
  | { status: 'session'; next: string | null }
  | { status: 'mfa'; tempToken: string }
  | { status: 'error'; error?: string }

/** Same-origin path only (reject protocol-relative / absolute URLs). */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw || !raw.startsWith('/')) return null
  if (raw.startsWith('//')) return null
  return raw
}

/** Installed PWA (display-mode) or iOS home-screen standalone. */
export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false
  const standaloneMedia =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches
  const nav = navigator as Navigator & { standalone?: boolean }
  const iosStandalone = nav.standalone === true
  return Boolean(standaloneMedia || iosStandalone)
}

/** Electron and restrictive standalone PWA must not open a popup. */
export function shouldForceOAuthRedirect(): boolean {
  return isDesktop() || isStandalonePwa()
}

export function getGoogleOAuthApiOrigin(): string {
  return new URL(API_URL).origin
}

function buildStartUrl(params: {
  intent: 'login' | 'register'
  next?: string | null
  display: 'popup' | 'page'
}): string {
  const returnOrigin = window.location.origin
  const url = new URL('/v1/auth/google', API_URL.replace(/\/$/, '') + '/')
  url.searchParams.set('returnOrigin', returnOrigin)
  url.searchParams.set('intent', params.intent)
  url.searchParams.set('display', params.display)
  const next = safeNextPath(params.next ?? null)
  if (next) url.searchParams.set('next', next)
  return url.toString()
}

function isValidBridgeMessage(data: unknown): data is GoogleOAuthBridgeMessage {
  if (!data || typeof data !== 'object') return false
  const msg = data as Record<string, unknown>
  return (
    msg.type === GOOGLE_OAUTH_MESSAGE_TYPE &&
    msg.v === GOOGLE_OAUTH_MESSAGE_VERSION &&
    (msg.status === 'session' || msg.status === 'mfa' || msg.status === 'error')
  )
}

function redirectWithPage(params: {
  intent: 'login' | 'register'
  next?: string | null
}): void {
  window.location.assign(buildStartUrl({ ...params, display: 'page' }))
}

/**
 * Start Google OAuth: popup on desktop web; full-page redirect on Electron,
 * standalone PWA, or when the popup is blocked.
 *
 * Popup completion invokes `onResult` (session cookies already set by the API).
 * Redirect modes navigate away — `onResult` is not called.
 */
export function startGoogleOAuth(params: {
  intent: 'login' | 'register'
  next?: string | null
  onResult?: (result: GoogleOAuthPopupResult) => void
}): void {
  if (shouldForceOAuthRedirect()) {
    redirectWithPage(params)
    return
  }

  const popupUrl = buildStartUrl({ ...params, display: 'popup' })
  const popup = window.open(
    popupUrl,
    GOOGLE_OAUTH_POPUP_NAME,
    GOOGLE_OAUTH_POPUP_FEATURES,
  )

  if (!popup) {
    redirectWithPage(params)
    return
  }

  const apiOrigin = getGoogleOAuthApiOrigin()
  let cleaned = false
  let closePollId: ReturnType<typeof setInterval> | undefined
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  const cleanup = () => {
    if (cleaned) return
    cleaned = true
    window.removeEventListener('message', onMessage)
    if (closePollId !== undefined) clearInterval(closePollId)
    if (timeoutId !== undefined) clearTimeout(timeoutId)
  }

  const onMessage = (event: MessageEvent) => {
    if (event.origin !== apiOrigin) return
    if (!isValidBridgeMessage(event.data)) return

    cleanup()

    const msg = event.data
    if (msg.status === 'session') {
      params.onResult?.({
        status: 'session',
        next: safeNextPath(msg.next ?? null),
      })
      return
    }
    if (msg.status === 'mfa') {
      if (!msg.tempToken?.trim()) {
        params.onResult?.({ status: 'error', error: 'OAUTH_MFA_MISSING_TOKEN' })
        return
      }
      params.onResult?.({ status: 'mfa', tempToken: msg.tempToken.trim() })
      return
    }
    params.onResult?.({ status: 'error', error: msg.error })
  }

  window.addEventListener('message', onMessage)

  closePollId = setInterval(() => {
    if (popup.closed) cleanup()
  }, 500)

  timeoutId = setTimeout(() => {
    cleanup()
    try {
      popup.close()
    } catch {
      // ignore
    }
    params.onResult?.({ status: 'error', error: 'OAUTH_POPUP_TIMEOUT' })
  }, GOOGLE_OAUTH_POPUP_TIMEOUT_MS)
}
