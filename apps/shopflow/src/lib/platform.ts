/**
 * Runtime platform adapter — the single seam between the web (browser) and
 * desktop (Tauri) builds of Shopflow.
 *
 * Scope for this slice (PR2, Vite/Router scaffold): detect the runtime only.
 * Secure-storage accessors and the bearer `AuthTransport` (design ADR-A2 /
 * ADR-A3 of `sdd/web-desktop-vite-tauri/design`) are wired in a later slice
 * (PR4, desktop transport adapter) once the API-side gated auth change
 * (PR1) has been reviewed and the route tree (PR3) has landed.
 */
export function isDesktop(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}
