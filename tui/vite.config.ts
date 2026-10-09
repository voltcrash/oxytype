import { sharedLint } from "../packages/oxlint-config/config";
import { tuiJsxOverride } from "./lint.config";
import { defineConfig } from "vite-plus";

export default defineConfig({
  lint: {
    ignorePatterns: ["node_modules", "dist", "assets"],
    // Extended after the shared config so its JSX override takes precedence.
    extends: [sharedLint, { overrides: [tuiJsxOverride] }],
    options: {
      typeAware: false,
      typeCheck: false,
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
