import { sharedLint, pluginLint } from "../packages/oxlint-config/config";
import type { OxlintConfig } from "vite-plus/lint";

export const backendLint: OxlintConfig = {
  ignorePatterns: ["node_modules", "__migration__", "dist", ".turbo"],
  extends: [sharedLint, pluginLint],
  overrides: [
    {
      files: ["src/**/*.ts"],
      rules: {
        "import/no-cycle": "off",
      },
    },
  ],
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
};
