import path from "node:path";
import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

// Merges the app's vite.config.ts (react, tailwindcss, tsconfig-paths, and
// the TanStack Router plugin) so `routeTree.gen.ts` is generated the same
// way for tests as it is for `dev`/`build:vite`.
//
// `vite.config.ts` became a function config in PR3 (needs `loadEnv` to
// build the `NEXT_PUBLIC_*` -> `VITE_*` `define` shim), so it must be
// invoked with a `{ mode, command }` env before merging.
export default defineConfig((configEnv) =>
  mergeConfig(
    viteConfig(configEnv),
    defineConfig({
      resolve: {
        alias: {
          "@": path.resolve(__dirname, "./src"),
        },
      },
      test: {
        environment: "jsdom",
      },
    }),
  ),
);
