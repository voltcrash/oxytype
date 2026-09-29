import tsdownConfig from "./tsdown.config.js";

import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: tsdownConfig,
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
