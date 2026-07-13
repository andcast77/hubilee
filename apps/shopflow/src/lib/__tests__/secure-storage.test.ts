import { describe, expect, it } from 'vitest'
import { createInMemoryTokenStorage, createTauriTokenStorage } from '../secure-storage'

describe('createInMemoryTokenStorage', () => {
  it('starts empty', async () => {
    const storage = createInMemoryTokenStorage()
    expect(await storage.getAccessToken()).toBeNull()
    expect(await storage.getRefreshToken()).toBeNull()
  })

  it('stores and returns the access/refresh pair', async () => {
    const storage = createInMemoryTokenStorage()
    await storage.setTokens({ accessToken: 'a1', refreshToken: 'r1' })
    expect(await storage.getAccessToken()).toBe('a1')
    expect(await storage.getRefreshToken()).toBe('r1')
  })

  it('clears both tokens', async () => {
    const storage = createInMemoryTokenStorage()
    await storage.setTokens({ accessToken: 'a1', refreshToken: 'r1' })
    await storage.clear()
    expect(await storage.getAccessToken()).toBeNull()
    expect(await storage.getRefreshToken()).toBeNull()
  })

  it('overwrites a previously stored pair on rotation', async () => {
    const storage = createInMemoryTokenStorage()
    await storage.setTokens({ accessToken: 'a1', refreshToken: 'r1' })
    await storage.setTokens({ accessToken: 'a2', refreshToken: 'r2' })
    expect(await storage.getAccessToken()).toBe('a2')
    expect(await storage.getRefreshToken()).toBe('r2')
  })
})

describe('createTauriTokenStorage (running outside a real Tauri webview, e.g. this test suite)', () => {
  it('does not throw and falls back to an in-memory store when the Tauri plugin bridge is unavailable', async () => {
    const storage = createTauriTokenStorage()
    await expect(storage.setTokens({ accessToken: 'a1', refreshToken: 'r1' })).resolves.toBeUndefined()
    expect(await storage.getAccessToken()).toBe('a1')
    expect(await storage.getRefreshToken()).toBe('r1')
  })

  it('clear() is also safe against the fallback', async () => {
    const storage = createTauriTokenStorage()
    await storage.setTokens({ accessToken: 'a1', refreshToken: 'r1' })
    await storage.clear()
    expect(await storage.getAccessToken()).toBeNull()
  })
})
