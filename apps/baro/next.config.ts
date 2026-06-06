import path from 'path'
import type { NextConfig } from 'next'

// Turbopack (`next dev`): turbopack.root + outputFileTracingRoot (bug pnpm en 16.2.4).
// Producción (`pnpm build`): forzamos webpack en package.json — en Windows/IIS, el build
// default con Turbopack + `next start` puede fallar con ChunkLoadError (chunk SSR ausente).
const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname, "..", ".."),
  },
  outputFileTracingRoot: path.join(__dirname, "..", ".."),
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
  serverExternalPackages: ['@prisma/client', '@prisma/adapter-pg', 'prisma', 'pg'],
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
