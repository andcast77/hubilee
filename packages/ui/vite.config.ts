import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import type { Plugin } from "vite";

const packageRoot = fileURLToPath(new URL(".", import.meta.url));

/**
 * Vite library mode emits CSS as a separate file and does not leave `import './index.css'`
 * in the JS bundle. Prepending it lets consumers load styles by importing `@hubilee/ui` alone.
 * Inlined here (no separate script) so CI/Vercel always has the logic even if `scripts/` is missing.
 */
function prependCssImportToBundle(): void {
  const distDir = path.join(packageRoot, "dist");
  const jsPath = path.join(distDir, "index.js");
  const cssName = "index.css";
  const cssPath = path.join(distDir, cssName);

  if (!fs.existsSync(jsPath)) {
    throw new Error(
      "inject-css-import: dist/index.js not found after Vite build.",
    );
  }
  if (!fs.existsSync(cssPath)) {
    throw new Error(`inject-css-import: dist/${cssName} not found.`);
  }

  const js = fs.readFileSync(jsPath, "utf8");
  const marker = `import './${cssName}'`;
  if (js.includes(marker)) {
    console.log("inject-css-import: CSS import already present, skipping.");
    return;
  }
  fs.writeFileSync(jsPath, `${marker};\n${js}`);
  console.log("inject-css-import: prepended CSS import to dist/index.js");
}

function injectCssImport(): Plugin {
  return {
    name: "inject-css-import",
    closeBundle() {
      prependCssImportToBundle();
    },
  };
}

export default defineConfig({
  plugins: [react(), injectCssImport()],
  build: {
    lib: {
      entry: path.join(packageRoot, "src/index.ts"),
      formats: ["es"],
      fileName: "index",
    },
    rollupOptions: {
      external: ["react", "react-dom", "react/jsx-runtime"],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === "style.css") return "styles.css";
          return assetInfo.name || "asset";
        },
      },
    },
    sourcemap: false,
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(packageRoot, "./src"),
    },
  },
});
