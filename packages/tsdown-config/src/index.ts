import type { PackUserConfig } from "vite-plus/pack";

export function extendConfig(overrides: PackUserConfig = {}): PackUserConfig {
  return {
    deps: { resolveDepSubpath: true },
    entry: ["src/**/*.ts"],
    sourcemap: true,
    clean: true,
    format: ["cjs", "esm"],
    dts: false,
    minify: true,
    ...overrides,
  };
}
