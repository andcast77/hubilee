/**
 * Runtime platform adapter — web (browser) vs desktop (Electron) for Pos.
 *
 * Web: cookie AuthTransport. Electron: Bearer + Electron token storage
 * (`safeStorage` via preload IPC).
 */
import type { ApiClientOptions, AuthTransport } from "@hubilee/shared";
import {
  createElectronTokenStorage,
  createInMemoryTokenStorage,
  type TokenStorage,
} from "./secure-storage";

export function isDesktop(): boolean {
  return (
    typeof window !== "undefined" && window.hubileeDesktop?.isElectron === true
  );
}

const desktopTokenStorage: TokenStorage = createElectronTokenStorage();

export function getTokenStorage(): TokenStorage {
  return isDesktop() ? desktopTokenStorage : createInMemoryTokenStorage();
}

export function createAuthTransport(): AuthTransport {
  if (!isDesktop()) return { mode: "cookie" };

  const storage = desktopTokenStorage;
  return {
    mode: "bearer",
    getAccessToken: () => storage.getAccessToken(),
    getRefreshToken: () => storage.getRefreshToken(),
    onRotated: (tokens) => storage.setTokens(tokens),
    onAuthCleared: () => storage.clear(),
  };
}

export async function clearDesktopSession(): Promise<void> {
  if (!isDesktop()) return;
  await desktopTokenStorage.clear();
}

export function createApiClientOptions(): ApiClientOptions {
  // Web: cookie jar + silent refresh on 401 (Hub pattern). Desktop: Bearer + refresh.
  if (!isDesktop()) return { refreshOn401: true };
  return { refreshOn401: true, authTransport: createAuthTransport() };
}
