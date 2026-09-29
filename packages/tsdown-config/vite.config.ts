import { sharedLint } from "../oxlint-config/config";
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
    extends: [sharedLint],
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
