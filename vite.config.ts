import { sharedLint } from "./packages/oxlint-config/config";
import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    // Vitest v4 compatibility: preserve mock call history.
    // Remove after tests no longer rely on calls from setup or earlier tests.
    // https://viteplus.dev/guide/vitest-v5#remove-unneeded-compatibility-settings
    // https://vitest.dev/guide/migration/#clearmocks-is-enabled-by-default
    clearMocks: false,
  },
  fmt: {
    printWidth: 80,
    tabWidth: 2,
    useTabs: false,
    htmlWhitespaceSensitivity: "ignore",
    endOfLine: "lf",
    trailingComma: "all",
    ignorePatterns: [
      "pnpm-lock.yaml",
      "node_modules",
      ".turbo",
      "dist",
      "build",
      "logs",
      "coverage",
      "*.md",
    ],
    overrides: [
      {
        files: ["**/*.tsx"],
        options: {
          experimentalTailwindcss: {
            stylesheet: "./frontend/src/styles/tailwind.css",
            attributes: ["cn"],
            functions: ["cn"],
          },
          experimentalSortImports: {
            groups: [
              "type-import",
              ["value-builtin", "value-external"],
              "type-internal",
              "value-internal",
              ["type-parent", "type-sibling", "type-index"],
              ["value-parent", "value-sibling", "value-index"],
              "unknown",
            ],
          },
        },
      },
    ],
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
