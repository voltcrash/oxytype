import { createRequire } from "node:module";
import type { OxlintOverride } from "vite-plus/lint";

const require = createRequire(import.meta.url);

// Replaces the shared DOM-oriented JSX rules for OpenTUI components.
export const tuiJsxOverride: OxlintOverride = {
  plugins: [
    "typescript",
    "unicorn",
    "oxc",
    "import",
    "node",
    "promise",
    "react",
  ],
  jsPlugins: [require.resolve("eslint-plugin-solid")],
  files: ["**/*.tsx"],
  rules: {
    "explicit-function-return-type": "off",
    // OpenTUI intrinsics are terminal renderables, not DOM elements.
    "react/no-unknown-property": "off",
    "react/react-in-jsx-scope": "off",
    "solid/components-return-once": "error",
    "solid/imports": "error",
    "solid/jsx-no-duplicate-props": "error",
    "solid/no-destructure": "error",
    "solid/no-react-deps": "error",
    "solid/no-react-specific-props": "error",
    "solid/prefer-for": "error",
    "solid/prefer-show": "error",
    "solid/reactivity": "error",
  },
};
