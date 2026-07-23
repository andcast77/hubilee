import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  GOOGLE_OAUTH_MESSAGE_TYPE,
  GOOGLE_OAUTH_MESSAGE_VERSION,
  GOOGLE_OAUTH_POPUP_FEATURES,
  GOOGLE_OAUTH_POPUP_NAME,
  isStandalonePwa,
  safeNextPath,
  shouldForceOAuthRedirect,
  startGoogleOAuth,
} from '../googleOAuth'

describe('safeNextPath', () => {
  it('allows same-origin paths only', () => {
    expect(safeNextPath('/dashboard')).toBe('/dashboard')
    expect(safeNextPath('/app/sales')).toBe('/app/sales')
    expect(safeNextPath('//evil.com')).toBeNull()
    expect(safeNextPath('https://evil.com')).toBeNull()
    expect(safeNextPath(null)).toBeNull()
  })
})

describe('isStandalonePwa / shouldForceOAuthRedirect', () => {
  afterEach(() => {
    delete window.hubileeDesktop
    vi.unstubAllGlobals()
  })

  it('detects display-mode standalone', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({ matches: true, media: '(display-mode: standalone)' }),
    )
    expect(isStandalonePwa()).toBe(true)
    expect(shouldForceOAuthRedirect()).toBe(true)
  })

  it('detects iOS navigator.standalone', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({ matches: false, media: '(display-mode: standalone)' }),
    )
    Object.defineProperty(navigator, 'standalone', {
      configurable: true,
      value: true,
    })
    expect(isStandalonePwa()).toBe(true)
    delete (navigator as Navigator & { standalone?: boolean }).standalone
  })

  it('forces redirect on Electron isDesktop()', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({ matches: false, media: '(display-mode: standalone)' }),
    )
    window.hubileeDesktop = {
      isElectron: true,
      getAccessToken: async () => null,
      getRefreshToken: async () => null,
      setTokens: async () => {},
      clearTokens: async () => {},
    }
    expect(shouldForceOAuthRedirect()).toBe(true)
  })
})

describe('startGoogleOAuth', () => {
  const originalLocation = window.location
  let openMock: ReturnType<typeof vi.fn>
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    delete window.hubileeDesktop
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({ matches: false, media: '(display-mode: standalone)' }),
    )
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        origin: 'http://localhost:3002',
        assign: vi.fn(),
      },
    })
    openMock = vi.fn().mockReturnValue(null)
    vi.stubGlobal('open', openMock)
    addEventListenerSpy = vi.spyOn(window, 'addEventListener')
    removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    })
    delete window.hubileeDesktop
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('navigates to API Google start with login intent and returnOrigin (null open → page)', () => {
    startGoogleOAuth({ intent: 'login', next: '/dashboard' })
    expect(openMock).toHaveBeenCalledWith(
      expect.stringContaining('display=popup'),
      GOOGLE_OAUTH_POPUP_NAME,
      GOOGLE_OAUTH_POPUP_FEATURES,
    )
    expect(window.location.assign).toHaveBeenCalled()
    const url = String(vi.mocked(window.location.assign).mock.calls[0]?.[0])
    expect(url).toContain('/v1/auth/google')
    expect(url).toContain('intent=login')
    expect(url).toContain('display=page')
    expect(url).toContain(encodeURIComponent('http://localhost:3002'))
    expect(url).toContain('next=%2Fdashboard')
  })

  it('navigates with register intent', () => {
    startGoogleOAuth({ intent: 'register' })
    const url = String(vi.mocked(window.location.assign).mock.calls[0]?.[0])
    expect(url).toContain('intent=register')
    expect(url).toContain('display=page')
  })

  it('forces page redirect on Electron without opening a popup', () => {
    window.hubileeDesktop = {
      isElectron: true,
      getAccessToken: async () => null,
      getRefreshToken: async () => null,
      setTokens: async () => {},
      clearTokens: async () => {},
    }
    startGoogleOAuth({ intent: 'login' })
    expect(openMock).not.toHaveBeenCalled()
    const url = String(vi.mocked(window.location.assign).mock.calls[0]?.[0])
    expect(url).toContain('display=page')
  })

  it('forces page redirect for standalone PWA', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({ matches: true, media: '(display-mode: standalone)' }),
    )
    startGoogleOAuth({ intent: 'login' })
    expect(openMock).not.toHaveBeenCalled()
    const url = String(vi.mocked(window.location.assign).mock.calls[0]?.[0])
    expect(url).toContain('display=page')
  })

  it('opens popup, accepts API-origin message, and cleans up', () => {
    const popup = { closed: false, close: vi.fn() }
    openMock.mockReturnValue(popup)

    const onResult = vi.fn()
    startGoogleOAuth({ intent: 'login', next: '/dashboard', onResult })

    expect(openMock).toHaveBeenCalledWith(
      expect.stringContaining('display=popup'),
      GOOGLE_OAUTH_POPUP_NAME,
      GOOGLE_OAUTH_POPUP_FEATURES,
    )
    expect(window.location.assign).not.toHaveBeenCalled()
    expect(addEventListenerSpy).toHaveBeenCalledWith('message', expect.any(Function))

    const handler = addEventListenerSpy.mock.calls.find(
      (c) => c[0] === 'message',
    )?.[1] as (event: MessageEvent) => void

    handler(
      new MessageEvent('message', {
        origin: 'http://localhost:3000',
        data: {
          type: GOOGLE_OAUTH_MESSAGE_TYPE,
          v: GOOGLE_OAUTH_MESSAGE_VERSION,
          status: 'session',
          next: '/dashboard',
        },
      }),
    )

    expect(onResult).toHaveBeenCalledWith({ status: 'session', next: '/dashboard' })
    expect(removeEventListenerSpy).toHaveBeenCalledWith('message', handler)
  })

  it('ignores messages from a foreign origin', () => {
    const popup = { closed: false, close: vi.fn() }
    openMock.mockReturnValue(popup)
    const onResult = vi.fn()
    startGoogleOAuth({ intent: 'login', onResult })

    const handler = addEventListenerSpy.mock.calls.find(
      (c) => c[0] === 'message',
    )?.[1] as (event: MessageEvent) => void

    handler(
      new MessageEvent('message', {
        origin: 'https://evil.example',
        data: {
          type: GOOGLE_OAUTH_MESSAGE_TYPE,
          v: GOOGLE_OAUTH_MESSAGE_VERSION,
          status: 'session',
        },
      }),
    )

    expect(onResult).not.toHaveBeenCalled()
    expect(removeEventListenerSpy).not.toHaveBeenCalledWith('message', handler)
  })

  it('cleans up when popup.closed without invoking onResult', () => {
    vi.useFakeTimers()
    const popup = { closed: false, close: vi.fn() }
    openMock.mockReturnValue(popup)
    const onResult = vi.fn()
    startGoogleOAuth({ intent: 'login', onResult })

    const handler = addEventListenerSpy.mock.calls.find(
      (c) => c[0] === 'message',
    )?.[1] as (event: MessageEvent) => void

    popup.closed = true
    vi.advanceTimersByTime(600)

    expect(onResult).not.toHaveBeenCalled()
    expect(removeEventListenerSpy).toHaveBeenCalledWith('message', handler)
  })

  it('delivers mfa and error payloads from the API origin', () => {
    const popup = { closed: false, close: vi.fn() }
    openMock.mockReturnValue(popup)
    const onResult = vi.fn()
    startGoogleOAuth({ intent: 'login', onResult })

    const handler = addEventListenerSpy.mock.calls.find(
      (c) => c[0] === 'message',
    )?.[1] as (event: MessageEvent) => void

    handler(
      new MessageEvent('message', {
        origin: 'http://localhost:3000',
        data: {
          type: GOOGLE_OAUTH_MESSAGE_TYPE,
          v: GOOGLE_OAUTH_MESSAGE_VERSION,
          status: 'mfa',
          tempToken: 'tmp-abc',
        },
      }),
    )
    expect(onResult).toHaveBeenCalledWith({ status: 'mfa', tempToken: 'tmp-abc' })
  })
})
