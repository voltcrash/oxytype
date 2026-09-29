import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    deps: { resolveDepSubpath: true },
    entry: ["src/index.ts"],
    sourcemap: false,
    clean: true,
    format: ["cjs", "esm"],
    dts: false,
  },
  lint: {
    ignorePatterns: ["node_modules", "dist", ".turbo"],
    extends: ["../oxlint-config/index.jsonc"],
    options: {
      typeAware: true,
      typeCheck: true,
    },
    jsPlugins: [
      {
        name: "vite-plus",
        specifier: "vite-plus/oxlint-plugin",
      },
    ],
    rules: {
      "vite-plus/prefer-vite-plus-imports": "error",
    },
  },
});
