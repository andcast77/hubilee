/**
 * Authenticated Pos webapp lives under `/app/*` (PWA scope / Hub parity).
 * Public marketing + auth stay at `/`, `/login`, `/register`, `/terms`,
 * `/forgot-password`, `/reset-password`.
 */

export const POS_APP_BASE = "/app";

/** Top-level path segments that belong to the authenticated webapp (legacy URLs). */
export const POS_LEGACY_APP_SEGMENTS = [
  "account",
  "admin",
  "caja",
  "categories",
  "customers",
  "dashboard",
  "inventory",
  "pos",
  "pos-vendedor",
  "products",
  "reports",
  "sales",
  "suppliers",
] as const;

export type PosLegacyAppSegment = (typeof POS_LEGACY_APP_SEGMENTS)[number];

/**
 * Prefix an app-relative path with `/app`.
 * Accepts `dashboard`, `/dashboard`, `/products/new` → `/app/...`.
 * Leaves already-prefixed `/app/...` and external/public paths unchanged when not legacy app.
 */
export function toAppPath(path: string): string {
  if (!path || path === "/") return `${POS_APP_BASE}/dashboard`;

  const [pathname, search = ""] = path.split("?");
  const query = search ? `?${search}` : "";
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;

  if (normalized === POS_APP_BASE || normalized.startsWith(`${POS_APP_BASE}/`)) {
    return `${normalized}${query}`;
  }

  return `${POS_APP_BASE}${normalized}${query}`;
}

/** Next.js `redirects()` entries: legacy authenticated URLs → `/app/*`. */
export function buildPosLegacyAppRedirects(): {
  source: string;
  destination: string;
  permanent: boolean;
}[] {
  return POS_LEGACY_APP_SEGMENTS.flatMap((segment) => [
    {
      source: `/${segment}`,
      destination: `${POS_APP_BASE}/${segment}`,
      permanent: true,
    },
    {
      source: `/${segment}/:path*`,
      destination: `${POS_APP_BASE}/${segment}/:path*`,
      permanent: true,
    },
  ]);
}
