import { afterEach, describe, expect, it } from 'vitest'
import { clearDesktopSession, createAuthTransport, getTokenStorage, isDesktop } from '../platform'

function setDesktop(on: boolean) {
  const w = window as unknown as { __TAURI_INTERNALS__?: unknown }
  if (on) w.__TAURI_INTERNALS__ = {}
  else delete w.__TAURI_INTERNALS__
}

describe('platform.isDesktop', () => {
  afterEach(() => {
    setDesktop(false)
  })

  it('returns false in a plain browser/web context', () => {
    expect(isDesktop()).toBe(false)
  })

  it('returns true when the Tauri internals bridge is present on window', () => {
    ;(window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {}
    expect(isDesktop()).toBe(true)
  })
})

describe('platform.createAuthTransport (PR4 desktop Bearer wiring)', () => {
  afterEach(async () => {
    setDesktop(true)
    await clearDesktopSession()
    setDesktop(false)
  })

  it('returns cookie mode on web — no transport change to the existing cookie path', () => {
    setDesktop(false)
    expect(createAuthTransport()).toEqual({ mode: 'cookie' })
  })

  it('returns a bearer transport backed by secure storage on desktop', async () => {
    setDesktop(true)
    const transport = createAuthTransport()
    expect(transport.mode).toBe('bearer')
    if (transport.mode !== 'bearer') throw new Error('unreachable')

    expect(await transport.getAccessToken()).toBeNull()

    await transport.onRotated({ accessToken: 'a1', refreshToken: 'r1' })
    expect(await transport.getAccessToken()).toBe('a1')
    expect(await transport.getRefreshToken()).toBe('r1')

    await transport.onAuthCleared()
    expect(await transport.getAccessToken()).toBeNull()
    expect(await transport.getRefreshToken()).toBeNull()
  })
})

describe('platform.clearDesktopSession', () => {
  afterEach(() => {
    setDesktop(false)
  })

  it('is a no-op on web', async () => {
    await expect(clearDesktopSession()).resolves.toBeUndefined()
  })

  it('clears the shared desktop token storage', async () => {
    setDesktop(true)
    const transport = createAuthTransport()
    if (transport.mode === 'bearer') {
      await transport.onRotated({ accessToken: 'a1', refreshToken: 'r1' })
    }

    await clearDesktopSession()

    expect(await getTokenStorage().getAccessToken()).toBeNull()
  })
})
