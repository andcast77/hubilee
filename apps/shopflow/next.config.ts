import path from "path";
import type { NextConfig } from "next";

const monorepoRoot = path.join(__dirname, "..", "..");

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: monorepoRoot,
  turbopack: {
    root: monorepoRoot,
  },

  transpilePackages: ["@multisystem/ui"],

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
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' http://localhost:* https: wss: ws: https://challenges.cloudflare.com; frame-src 'self' https://challenges.cloudflare.com; frame-ancestors 'none';",
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
