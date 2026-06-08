import path from 'path'
import type { NextConfig } from 'next'

// Monorepo: turbopack.root + outputFileTracingRoot for pnpm workspace tracing.
// Production: standalone output + `node apps/baro/server.js` (see docker/Dockerfile.nextjs).
const monorepoRoot = path.join(/* turbopackIgnore: true */ __dirname, '..', '..')

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@multisystem/ui'],
  turbopack: {
    root: monorepoRoot,
  },
  outputFileTracingRoot: monorepoRoot,
  outputFileTracingIncludes: {
    '/expedientes/[id]/descargar/[tipo]': ['./context/**/*'],
  },
  distDir: '.next',
  experimental: {
    serverActions: {
      ...(process.env.SERVER_ACTIONS_ALLOWED_ORIGINS?.trim()
        ? {
            allowedOrigins: process.env.SERVER_ACTIONS_ALLOWED_ORIGINS.split(',')
              .map((s) => s.trim())
              .filter(Boolean),
          }
        : {}),
    },
  },
  compress: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/app/:path*',
        destination: '/:path*',
        permanent: true,
      },
      {
        source: '/mensuras',
        destination: '/expedientes',
        permanent: true,
      },
      {
        source: '/mensuras/:path*',
        destination: '/expedientes/:path*',
        permanent: true,
      },
    ]
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
}

export default nextConfig
