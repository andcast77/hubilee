import type { MetadataRoute } from "next";

/** Pos PWA theme — brand blue used in viewport themeColor. */
export const POS_PWA_THEME_COLOR = "#2563eb";

/** Service worker script URL (served from `public/sw.js`). */
export const POS_SW_SCRIPT_URL = "/sw.js";

/**
 * Hardcoded SW registration scope — authenticated webapp only.
 * Must stay under `/app/` so marketing `/` is not the PWA root.
 */
export const POS_SW_SCOPE = "/app/";

/** Web app manifest for Pos installability under `/app/`. */
export function buildPosWebAppManifest(): MetadataRoute.Manifest {
  return {
    name: "Pos",
    short_name: "Pos",
    description:
      "Pos: punto de venta, inventario y operación retail del ecosistema Hubilee.",
    start_url: "/app/",
    scope: "/app/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: POS_PWA_THEME_COLOR,
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
export function getPosServiceWorkerRegistration(): {
  scriptUrl: typeof POS_SW_SCRIPT_URL;
  options: { scope: typeof POS_SW_SCOPE };
} {
  return {
    scriptUrl: POS_SW_SCRIPT_URL,
    options: { scope: POS_SW_SCOPE },
  };
}

/**
 * Pos Content-Security-Policy including explicit `worker-src 'self'`
 * so `/app` SW registration is not blocked.
 */
export function buildPosContentSecurityPolicy(): string {
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
