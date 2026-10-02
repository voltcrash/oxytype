import { defineConfig, TestProjectInlineConfiguration } from "vite-plus";

export const projects = [
  {
    test: {
      name: { label: "d1", color: "cyan" },
      include: ["__tests__/d1/**/*.spec.ts"],
      testTimeout: 30_000,
      hookTimeout: 30_000,
      fileParallelism: false,
    },
  },
  {
    test: {
      name: { label: "unit", color: "blue" },
      setupFiles: ["__tests__/setup-tests.ts"],
      include: ["__tests__/**/*.spec.ts"],
      exclude: ["__tests__/__integration__/**", "__tests__/d1/**"],
      sequence: {
        groupOrder: 0,
      },
    },
  },
  {
    test: {
      name: { label: "integration", color: "yellow" },
      setupFiles: ["__tests__/__integration__/setup-integration-tests.ts"],
      globalSetup: "__tests__/__integration__/global-setup.ts",
      include: ["__tests__/__integration__/**/*.spec.ts"],
      exclude: ["**/*.isolated.spec.ts"],
      // These files reset and migrate a shared database.
      fileParallelism: false,
      testTimeout: 30_000,
      hookTimeout: 30_000,

      sequence: {
        concurrent: false,
        groupOrder: 1,
      },
    },
  },
  {
    test: {
      name: { label: "integration-isolated", color: "magenta" },
      setupFiles: ["__tests__/__integration__/setup-integration-tests.ts"],
      globalSetup: "__tests__/__integration__/global-setup.ts",
      include: ["__tests__/__integration__/**/*.isolated.spec.ts"],

      sequence: {
        concurrent: false,
        groupOrder: 2,
      },
      pool: "threads",
      maxWorkers: 1,
      testTimeout: 30_000,
      hookTimeout: 30_000,
    },
  },
] satisfies TestProjectInlineConfiguration[];
export default defineConfig({
  test: {
    // Vitest v4 compatibility: preserve mock call history.
    // Remove after tests no longer rely on calls from setup or earlier tests.
    // https://viteplus.dev/guide/vitest-v5#remove-unneeded-compatibility-settings
    // https://vitest.dev/guide/migration/#clearmocks-is-enabled-by-default
    clearMocks: false,
    projects: projects,
    environment: "node",
    pool: "forks",
    coverage: {
      include: ["**/*.ts"],
    },
  },
});
