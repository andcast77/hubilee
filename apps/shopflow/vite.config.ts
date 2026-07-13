import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

// Vite + file-based TanStack Router scaffold for Shopflow.
// See `sdd/web-desktop-vite-tauri/design` ADR-B (routing) and ADR-E (single
// build, dual consumer: same `dist/` output serves the web SPA and the
// Tauri `frontendDist`).
export default defineConfig({
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
  build: {
    outDir: 'dist',
  },
})
