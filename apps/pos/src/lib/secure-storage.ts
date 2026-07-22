/**
 * Desktop token storage for Electron (Bearer auth).
 * Web keeps tokens out of JS (httpOnly cookies). Desktop persists via the
 * preload bridge → main-process `safeStorage`. Falls back to in-memory when
 * the bridge is missing (tests / plain browser).
 */

export type StoredTokens = { accessToken: string; refreshToken: string }

export interface TokenStorage {
  getAccessToken(): Promise<string | null>
  getRefreshToken(): Promise<string | null>
  setTokens(tokens: StoredTokens): Promise<void>
  clear(): Promise<void>
}

/** In-memory implementation — tests, web stub, and Electron fallback. */
export function createInMemoryTokenStorage(): TokenStorage {
  let tokens: StoredTokens | null = null
  return {
    async getAccessToken() {
      return tokens?.accessToken ?? null
    },
    async getRefreshToken() {
      return tokens?.refreshToken ?? null
    },
    async setTokens(next) {
      tokens = next
    },
    async clear() {
      tokens = null
    },
  }
}

function getBridge(): NonNullable<Window["hubileeDesktop"]> | undefined {
  if (typeof window === "undefined") return undefined;
  return window.hubileeDesktop;
}

/**
 * Electron-backed storage via `window.hubileeDesktop` IPC.
 * Falls back to in-memory when the preload bridge is unavailable.
 */
export function createElectronTokenStorage(): TokenStorage {
  const fallback = createInMemoryTokenStorage()

  return {
    async getAccessToken() {
      const bridge = getBridge()
      if (!bridge?.isElectron) return fallback.getAccessToken()
      try {
        return await bridge.getAccessToken()
      } catch {
        return fallback.getAccessToken()
      }
    },
    async getRefreshToken() {
      const bridge = getBridge()
      if (!bridge?.isElectron) return fallback.getRefreshToken()
      try {
        return await bridge.getRefreshToken()
      } catch {
        return fallback.getRefreshToken()
      }
    },
    async setTokens(tokens) {
      const bridge = getBridge()
      if (!bridge?.isElectron) return fallback.setTokens(tokens)
      try {
        await bridge.setTokens(tokens)
      } catch {
        await fallback.setTokens(tokens)
      }
    },
    async clear() {
      const bridge = getBridge()
      if (!bridge?.isElectron) return fallback.clear()
      try {
        await bridge.clearTokens()
      } catch {
        await fallback.clear()
      }
    },
  }
}
