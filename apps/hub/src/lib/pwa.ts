import type { MetadataRoute } from "next";

/** Hub PWA theme matches brand indigo used in UI accents. */
export const HUB_PWA_THEME_COLOR = "#6366F1";

/** Service worker script URL (served from `public/sw.js`). */
export const HUB_SW_SCRIPT_URL = "/sw.js";

/**
 * Hardcoded SW registration scope — dashboard webapp only.
 * Do not widen to `/` (Pos follow-up debt).
 */
export const HUB_SW_SCOPE = "/dashboard/";

/** Web app manifest for Hub installability under `/dashboard/`. */
export function buildHubWebAppManifest(): MetadataRoute.Manifest {
  return {
    name: "Hubilee",
    short_name: "Hubilee",
    description: "Hubilee — panel de empresa y módulos",
    start_url: "/dashboard/",
    scope: "/dashboard/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: HUB_PWA_THEME_COLOR,
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}

/** Options for `navigator.serviceWorker.register` — scope is hardcoded. */
export function getHubServiceWorkerRegistration(): {
  scriptUrl: typeof HUB_SW_SCRIPT_URL;
  options: { scope: typeof HUB_SW_SCOPE };
} {
  return {
    scriptUrl: HUB_SW_SCRIPT_URL,
    options: { scope: HUB_SW_SCOPE },
  };
}

/**
 * Hub Content-Security-Policy including explicit `worker-src 'self'`
 * so dashboard SW registration is not blocked.
 */
export function buildHubContentSecurityPolicy(): string {
  return (
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' data:; " +
    "connect-src 'self' http://localhost:* https: wss: ws: https://challenges.cloudflare.com; " +
    "frame-src 'self' https://challenges.cloudflare.com; " +
    "frame-ancestors 'none'; " +
    "worker-src 'self';"
  );
}
