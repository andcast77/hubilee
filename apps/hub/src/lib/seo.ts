import type { Metadata } from "next";

/** Fallback when `NEXT_PUBLIC_HUB_URL` is missing or not an absolute http(s) URL. */
export const HUB_METADATA_FALLBACK = "http://localhost:3001";

/** Auth routes excluded from crawl targeting (robots disallow + sitemap absence). */
export const AUTH_DISALLOW_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
] as const;

/** Shared route-level metadata for Hub auth pages. */
export const AUTH_NOINDEX_METADATA = {
  robots: { index: false, follow: false },
} as const satisfies Metadata;

const DEFAULT_DESCRIPTION =
  "Hubilee — plataforma unificada para gestión de módulos";

/**
 * Resolve Hub `metadataBase` from a public URL env value (Pos-style parse).
 */
export function resolveHubMetadataBaseUrl(
  raw: string | undefined = process.env.NEXT_PUBLIC_HUB_URL,
): URL {
  const trimmed = raw?.trim();
  if (trimmed && /^https?:\/\//i.test(trimmed)) {
    try {
      return new URL(trimmed);
    } catch {
      /* fall through */
    }
  }
  return new URL(HUB_METADATA_FALLBACK);
}

/** Root marketing metadata fields (layout consumes this + keeps viewport). */
export function buildHubRootMetadata(metadataBase: URL): Metadata {
  return {
    metadataBase,
    applicationName: "Hubilee",
    title: {
      default: "Hubilee",
      template: "%s · Hubilee",
    },
    description: DEFAULT_DESCRIPTION,
    icons: {
      icon: "/favicon.ico",
    },
    openGraph: {
      type: "website",
      locale: "es",
      siteName: "Hubilee",
      title: "Hubilee",
      description: DEFAULT_DESCRIPTION,
    },
    twitter: {
      card: "summary",
      title: "Hubilee",
      description: DEFAULT_DESCRIPTION,
    },
  };
}

/** Next.js `robots.ts` rules: allow `/`, disallow auth paths. */
export function buildHubRobotsConfig() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...AUTH_DISALLOW_PATHS],
    },
  };
}

/** Sitemap entries: marketing `/` only (absolute URLs). */
export function buildHubSitemapEntries(
  metadataBase: URL,
): { url: string }[] {
  return [{ url: new URL("/", metadataBase).href }];
}
