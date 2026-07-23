import { API_URL } from '@/lib/api/client'
import { isDesktop } from '@/lib/platform'

export const GOOGLE_OAUTH_MESSAGE_TYPE = 'hubilee:google-oauth' as const
export const GOOGLE_OAUTH_MESSAGE_VERSION = 1 as const
export const GOOGLE_OAUTH_POPUP_NAME = 'hubilee_google_oauth'
export const GOOGLE_OAUTH_POPUP_WIDTH = 500
export const GOOGLE_OAUTH_POPUP_HEIGHT = 700
/** Base features; left/top are computed at open time so the popup centers. */
export const GOOGLE_OAUTH_POPUP_FEATURES = `popup=yes,width=${GOOGLE_OAUTH_POPUP_WIDTH},height=${GOOGLE_OAUTH_POPUP_HEIGHT}`

/** Center the popup on the opener's screen (multi-monitor aware via screenX/Y). */
export function googleOAuthPopupFeatures(
  width = GOOGLE_OAUTH_POPUP_WIDTH,
  height = GOOGLE_OAUTH_POPUP_HEIGHT,
): string {
  const dualScreenLeft = window.screenLeft ?? window.screenX ?? 0
  const dualScreenTop = window.screenTop ?? window.screenY ?? 0
  const viewportWidth = window.innerWidth ?? document.documentElement.clientWidth ?? screen.width
  const viewportHeight = window.innerHeight ?? document.documentElement.clientHeight ?? screen.height
  const left = Math.max(0, Math.round(dualScreenLeft + (viewportWidth - width) / 2))
  const top = Math.max(0, Math.round(dualScreenTop + (viewportHeight - height) / 2))
  return `popup=yes,width=${width},height=${height},left=${left},top=${top}`
}
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

/** Human-readable toast for API `oauth_error` / bridge error codes. */
export function googleOAuthErrorMessage(code: string | null | undefined): string {
  switch (code) {
    case 'USER_NOT_FOUND':
      return 'No hay una cuenta asociada a ese mail.'
    case 'GOOGLE_EMAIL_NOT_VERIFIED':
      return 'El email de Google no está verificado.'
    case 'GOOGLE_OAUTH_DISABLED':
    case 'OAUTH_STORE_UNAVAILABLE':
      return 'Google OAuth no está disponible ahora. Intentá más tarde.'
    default:
      return 'No se pudo iniciar sesión con Google. Intentá de nuevo.'
  }
}

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
    googleOAuthPopupFeatures(),
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
