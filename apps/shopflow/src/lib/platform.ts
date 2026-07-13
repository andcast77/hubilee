/**
 * Runtime platform adapter — the single seam between the web (browser) and
 * desktop (Tauri) builds of Shopflow.
 *
 * PR2 (Vite/Router scaffold) added `isDesktop()` only. PR4 (this slice)
 * wires the desktop auth transport per design ADR-A2/ADR-A3 of
 * `sdd/web-desktop-vite-tauri/design`: a shared secure-token-storage
 * singleton and the `AuthTransport` `ApiClient` picks cookie-vs-Bearer from.
 */
import type { AuthTransport } from '@multisystem/shared'
import { createInMemoryTokenStorage, createTauriTokenStorage, type TokenStorage } from './secure-storage'

export function isDesktop(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

/**
 * Desktop token storage singleton. Safe to hold for the app's lifetime: the
 * Tauri plugin bridge is only touched lazily on first read/write (see
 * `secure-storage.ts`), so constructing it eagerly has no effect on web.
 */
const desktopTokenStorage: TokenStorage = createTauriTokenStorage()

/**
 * Returns the token storage for the current platform. On web this is a
 * fresh, non-persistent in-memory store (web never keeps tokens in JS —
 * this only exists so callers have a uniform seam); on desktop it is the
 * shared `desktopTokenStorage` singleton.
 */
export function getTokenStorage(): TokenStorage {
  return isDesktop() ? desktopTokenStorage : createInMemoryTokenStorage()
}

/**
 * Builds the `AuthTransport` `ApiClient` should use for the current
 * platform (design ADR-A3): `cookie` on web (the pre-PR4 default, byte
 * identical), `bearer` (backed by `desktopTokenStorage`) on desktop.
 */
export function createAuthTransport(): AuthTransport {
  if (!isDesktop()) return { mode: 'cookie' }

  const storage = desktopTokenStorage
  return {
    mode: 'bearer',
    getAccessToken: () => storage.getAccessToken(),
    getRefreshToken: () => storage.getRefreshToken(),
    onRotated: (tokens) => storage.setTokens(tokens),
    onAuthCleared: () => storage.clear(),
  }
}

/**
 * Clears the desktop session (design: "Desktop Logout Clears Token"). No-op
 * on web, where there is nothing to clear.
 */
export async function clearDesktopSession(): Promise<void> {
  if (!isDesktop()) return
  await desktopTokenStorage.clear()
}
