import path from "node:path";
import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

// Merges the app's vite.config.ts (react, tailwindcss, tsconfig-paths, and
// the TanStack Router plugin) so `routeTree.gen.ts` is generated the same
// way for tests as it is for `dev`/`build:vite`.
export default mergeConfig(
  viteConfig,
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
);
