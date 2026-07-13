/**
 * Desktop token storage seam (design `sdd/web-desktop-vite-tauri/design`
 * ADR-A2, OPEN QUESTION 1, PR4).
 *
 * The access token is JS-readable on desktop (Bearer transport, decision
 * `sdd/web-desktop-vite-tauri/decision-auth-transport`), so at-rest
 * protection matters. Design recommends an OS-keychain-backed store (e.g.
 * `@tauri-apps/plugin-stronghold` or a keyring plugin); `@tauri-apps/
 * plugin-store` (plaintext-at-rest JSON in the app-data dir) is called out
 * as ACCEPTABLE for this first POC slice, and is what's wired below.
 *
 * FLAG for verify: this is genuinely a Tauri-backed implementation (real
 * dependency, real plugin API calls), but it is NOT build-verified against
 * an actual Tauri app in this slice — `apps/shopflow/src-tauri/` does not
 * exist yet (that's PR5). Outside a real Tauri webview (this test suite,
 * web builds, or a misconfigured desktop build missing the plugin's Rust
 * registration) the plugin bridge throws, and this module falls back to an
 * in-memory store so callers never crash — they simply won't persist
 * tokens across a reload until PR5 finishes wiring the Tauri side.
 * Upgrading to an OS keychain (design OPEN QUESTION 1) is still open and
 * should happen before any non-POC use.
 */

export type StoredTokens = { accessToken: string; refreshToken: string }

export interface TokenStorage {
  getAccessToken(): Promise<string | null>
  getRefreshToken(): Promise<string | null>
  setTokens(tokens: StoredTokens): Promise<void>
  clear(): Promise<void>
}

const STORE_FILE = 'auth-tokens.json'
const ACCESS_KEY = 'accessToken'
const REFRESH_KEY = 'refreshToken'

/** In-memory implementation — used in tests, on web, and as the desktop fallback. */
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

type PluginStoreHandle = {
  get<T>(key: string): Promise<T | null | undefined>
  set(key: string, value: unknown): Promise<void>
  delete(key: string): Promise<boolean>
  save(): Promise<void>
}

/**
 * Tauri-backed implementation. Lazily imports `@tauri-apps/plugin-store` so
 * the web bundle never evaluates Tauri-only code, and transparently falls
 * back to an in-memory store if the plugin bridge is unavailable (see file
 * header). The resolved backend (real store vs. fallback) is cached for the
 * lifetime of the returned `TokenStorage`.
 */
export function createTauriTokenStorage(): TokenStorage {
  const fallback = createInMemoryTokenStorage()
  let resolved: TokenStorage | null = null
  let resolving: Promise<TokenStorage> | null = null

  async function resolveBackend(): Promise<TokenStorage> {
    if (resolved) return resolved
    if (!resolving) {
      resolving = (async () => {
        try {
          const { load } = await import('@tauri-apps/plugin-store')
          const store = (await load(STORE_FILE, { autoSave: true, defaults: {} })) as PluginStoreHandle
          resolved = {
            async getAccessToken() {
              return (await store.get<string>(ACCESS_KEY)) ?? null
            },
            async getRefreshToken() {
              return (await store.get<string>(REFRESH_KEY)) ?? null
            },
            async setTokens(tokens) {
              await store.set(ACCESS_KEY, tokens.accessToken)
              await store.set(REFRESH_KEY, tokens.refreshToken)
              await store.save()
            },
            async clear() {
              await store.delete(ACCESS_KEY)
              await store.delete(REFRESH_KEY)
              await store.save()
            },
          }
        } catch {
          // Not running inside a real Tauri webview, or the plugin isn't
          // registered on the Rust side yet (PR5 wires `src-tauri/`).
          resolved = fallback
        }
        return resolved
      })()
    }
    return resolving
  }

  return {
    async getAccessToken() {
      return (await resolveBackend()).getAccessToken()
    },
    async getRefreshToken() {
      return (await resolveBackend()).getRefreshToken()
    },
    async setTokens(tokens) {
      return (await resolveBackend()).setTokens(tokens)
    },
    async clear() {
      return (await resolveBackend()).clear()
    },
  }
}
