import path from "path";
import type { NextConfig } from "next";

const monorepoRoot = path.join(__dirname, "..", "..");

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: monorepoRoot,
  // Turbopack needs access to monorepo root for workspace packages
  turbopack: {
    root: monorepoRoot,
  },
  
  transpilePackages: ["@multisystem/ui"],

  // basePath eliminado - cada módulo tiene su propio dominio en Vercel
  // Configuraciones de seguridad críticas
  poweredByHeader: false, // Remover header X-Powered-By
  compress: true, // Habilitar compresión
  generateEtags: false, // Deshabilitar ETags para evitar cacheo
  
  // Headers de seguridad globales
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' http://localhost:* https: https://challenges.cloudflare.com; frame-src 'self' https://challenges.cloudflare.com; frame-ancestors 'none';"
          }
        ]
      }
    ];
  },

  // Configuraciones de seguridad adicionales
  serverExternalPackages: [], // Configuración correcta para Next.js 15

  // Configuraciones de imágenes
  images: {
    domains: [], // No permitir dominios externos por defecto
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },

  // Configuraciones de TypeScript
  typescript: {
    ignoreBuildErrors: false, // No ignorar errores de TypeScript
  },
};

export default nextConfig;
