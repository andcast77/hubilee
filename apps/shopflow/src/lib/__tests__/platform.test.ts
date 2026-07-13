import { afterEach, describe, expect, it } from 'vitest'
import { isDesktop } from '../platform'

describe('platform.isDesktop', () => {
  afterEach(() => {
    delete (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__
  })

  it('returns false in a plain browser/web context', () => {
    expect(isDesktop()).toBe(false)
  })

  it('returns true when the Tauri internals bridge is present on window', () => {
    ;(window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {}
    expect(isDesktop()).toBe(true)
  })
})
