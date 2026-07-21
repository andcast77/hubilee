import path from "path";
import type { NextConfig } from "next";
import { buildHubContentSecurityPolicy } from "./src/lib/pwa";

const monorepoRoot = path.join(__dirname, "..", "..");

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: monorepoRoot,
  turbopack: {
    root: monorepoRoot,
  },

  transpilePackages: ["@hubilee/ui"],

  poweredByHeader: false,
  compress: true,
  generateEtags: false,

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: buildHubContentSecurityPolicy(),
          },
        ],
      },
    ];
  },

  serverExternalPackages: [],

  images: {
    domains: [],
    formats: ["image/webp", "image/avif"],
    minimumCacheTTL: 60,
  },

  typescript: {
    ignoreBuildErrors: false,
  },

  /** Dev: proxy /v1 to API (same behavior as Vite) when Hub runs on :3001 */
  async rewrites() {
    if (process.env.NODE_ENV === "development") {
      return [
        {
          source: "/v1/:path*",
          destination: "http://127.0.0.1:3000/v1/:path*",
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
