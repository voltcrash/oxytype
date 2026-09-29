import { defineConfig } from "vite-plus/pack";

export default defineConfig((_options) => ({
  deps: {
    // tsdown <0.23 compatibility: resolve external dependency subpaths.
    // Remove to preserve subpath imports as written (the new default).
    // https://tsdown.dev/options/dependencies#deps-resolvedepsubpath
    resolveDepSubpath: true,
  },
  entry: ["src/index.ts"],
  splitting: false,
  sourcemap: false,
  clear: !_options?.watch,
  format: ["cjs", "esm"],
  dts: false,
}));
