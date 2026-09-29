import { defineConfig, UserWorkspaceConfig } from "vite-plus";
import { projects as backendProjects } from "./backend/vitest.config";
import { projects as frontendProjects } from "./frontend/vitest.config";

//oxlint-disable-next-line no-explicit-any
let globalPlugins: any[] = [];

export default defineConfig({
  test: {
    // Vitest v4 compatibility: preserve mock call history.
    // Remove after tests no longer rely on calls from setup or earlier tests.
    // https://viteplus.dev/guide/vitest-v5#remove-unneeded-compatibility-settings
    // https://vitest.dev/guide/migration/#clearmocks-is-enabled-by-default
    clearMocks: false,
    // Vitest v4 compatibility: keep separate Vite servers for inline projects.
    // Remove when plugins and config hooks can run once for shared projects.
    // https://viteplus.dev/guide/vitest-v5#remove-unneeded-compatibility-settings
    // https://vitest.dev/guide/migration/#inline-projects-share-the-vite-server-by-default
    sharedViteServer: false,
    projects: [
      ...convertTests(backendProjects, "backend"),
      ...convertTests(frontendProjects, "frontend"),
      "packages/**/vitest.config.ts",
    ],
  },
  plugins: globalPlugins,
});

function convertTests(
  projects: unknown[],
  root: string,
): UserWorkspaceConfig[] {
  return (projects as UserWorkspaceConfig[]).map((it) => {
    const test = it.test ?? {};
    const name: string | { label: string } = test.name ?? "unknown";
    copySolidPlugin(it);

    let updatedName =
      name === null || typeof name === "string"
        ? `${name}-${root}`
        : { ...name, label: `${name.label}-${root}` };

    return {
      ...it,
      test: {
        ...test,
        root,
        name: updatedName,
      },
    } as UserWorkspaceConfig;
  });
}

/**
 * Tests for solidJs need the solid plugin to run on config level and on test level. idk why
 */
function copySolidPlugin(config: UserWorkspaceConfig): void {
  if (!config.plugins) return;
  config.plugins
    //@ts-expect-error this is fine
    .filter((it) => it?.name === "solid")
    .forEach((it) => globalPlugins.push(it));
}
