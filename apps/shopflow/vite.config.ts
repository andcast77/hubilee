import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

// Vite + file-based TanStack Router scaffold for Shopflow.
// See `sdd/web-desktop-vite-tauri/design` ADR-B (routing) and ADR-E (single
// build, dual consumer: same `dist/` output serves the web SPA and the
// Tauri `frontendDist`).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')

  // `NEXT_PUBLIC_*` -> `VITE_*` compatibility shim (PR3, route-tree
  // migration). Shared library code under `src/lib`, `src/hooks`, and
  // `src/views` still reads `process.env.NEXT_PUBLIC_*` directly, and it is
  // now imported by BOTH the coexisting Next.js app (PR2/PR3 keep Next
  // building) and the new Vite/TanStack routes built in this slice.
  // Rewriting every shared consumer to `src/env.ts` (the `VITE_*` accessor
  // added in PR2) was evaluated and rejected for this slice: those files are
  // also imported by Next.js pages that Next statically prerenders, and
  // `import.meta.env` is not defined under Next's webpack build. Instead,
  // statically substitute each `process.env.NEXT_PUBLIC_*` identifier with
  // its `VITE_*` counterpart at Vite build time via esbuild `define`. This
  // touches zero consumer files (no Next regression risk) and makes the
  // Vite bundle read the correct value instead of crashing on a bare
  // `process` reference in the browser.
  const nextPublicToVite: Record<string, string> = {
    NEXT_PUBLIC_API_URL: 'VITE_API_URL',
    NEXT_PUBLIC_HUB_URL: 'VITE_HUB_URL',
    NEXT_PUBLIC_SHOPFLOW_URL: 'VITE_SHOPFLOW_URL',
    NEXT_PUBLIC_TECHSERVICES_URL: 'VITE_TECHSERVICES_URL',
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: 'VITE_TURNSTILE_SITE_KEY',
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: 'VITE_VAPID_PUBLIC_KEY',
    NEXT_PUBLIC_WORKIFY_URL: 'VITE_WORKIFY_URL',
  }
  const define = Object.fromEntries(
    Object.entries(nextPublicToVite).map(([nextKey, viteKey]) => {
      const value = env[viteKey]
      // Mirror Next's actual behavior for an unset env var (`undefined`,
      // not an empty string) so optional-chaining fallbacks in consumers
      // (e.g. `process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string |
      // undefined`) keep working identically.
      const literal = value !== undefined && value !== '' ? JSON.stringify(value) : 'undefined'
      return [`process.env.${nextKey}`, literal]
    }),
  )

  return {
    plugins: [
      // Must run before the react plugin: generates `src/routeTree.gen.ts`
      // from the file tree under `src/routes/`.
      tanstackRouter({
        target: 'react',
        autoCodeSplitting: true,
        routesDirectory: './src/routes',
        generatedRouteTree: './src/routeTree.gen.ts',
      }),
      react(),
      tailwindcss(),
      tsconfigPaths(),
    ],
    define,
    build: {
      outDir: 'dist',
    },
  }
})
