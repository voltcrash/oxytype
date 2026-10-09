import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";

const repoRoot = resolve(__dirname, "../..");
const tsx = createRequire(__filename).resolve("tsx/cli");

type Build = {
  target: string;
  args: string[];
  backendUrl?: string;
  siteKey?: string;
  providers?: string;
  authSecret?: string;
  turnstileSecret?: string;
};

describe("production build command", () => {
  let root: string;

  function write(path: string, contents: string): void {
    writeFileSync(resolve(root, path), contents);
  }

  function run(env: NodeJS.ProcessEnv = {}): SpawnSyncReturns<string> {
    return spawnSync(
      process.execPath,
      [tsx, resolve(root, "backend/scripts/build-production-site.ts")],
      {
        // The script must locate its workspace independently of the caller.
        cwd: tmpdir(),
        env: { ...process.env, CI: "true", ...env },
        encoding: "utf8",
        timeout: 30_000,
      },
    );
  }

  function builds(): Build[] {
    const path = resolve(root, "builds.jsonl");
    if (!existsSync(path)) return [];
    return readFileSync(path, "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as Build);
  }

  beforeEach(() => {
    root = mkdtempSync(resolve(tmpdir(), "oxytype-production-build-"));
    mkdirSync(resolve(root, "backend/scripts"), { recursive: true });
    mkdirSync(resolve(root, "frontend"));
    mkdirSync(resolve(root, "node_modules/.bin"), { recursive: true });
    symlinkSync(
      resolve(repoRoot, "node_modules/.bin/vp"),
      resolve(root, "node_modules/.bin/vp"),
    );
    symlinkSync(
      resolve(repoRoot, "node_modules/vite-plus"),
      resolve(root, "node_modules/vite-plus"),
      "dir",
    );
    symlinkSync(
      resolve(repoRoot, "backend/node_modules"),
      resolve(root, "backend/node_modules"),
      "dir",
    );
    for (const name of ["build-production-site.ts", "production-inputs.ts"]) {
      copyFileSync(
        resolve(repoRoot, "backend/scripts", name),
        resolve(root, "backend/scripts", name),
      );
    }
    copyFileSync(
      resolve(repoRoot, "backend/wrangler.production.json"),
      resolve(root, "backend/wrangler.production.json"),
    );
    write("pnpm-workspace.yaml", "packages:\n  - frontend\n  - backend\n");
    write(
      "package.json",
      JSON.stringify({
        name: "production-build-fixture",
        private: true,
        scripts: {
          "build-fe": "vp run --filter @oxytype/frontend build",
          "build-be": "vp run --filter @oxytype/backend build",
        },
      }),
    );
    // Enable caching to ensure the production command explicitly bypasses it.
    write("vite.config.mjs", "export default { run: { cache: true } };\n");
    for (const target of ["frontend", "backend"]) {
      write(
        `${target}/package.json`,
        JSON.stringify({
          name: `@oxytype/${target}`,
          private: true,
          scripts: { build: `node ../fixture-build.mjs ${target}` },
        }),
      );
    }
    write(
      "backend/.dev.vars.production",
      "BETTER_AUTH_SECRET=production-auth-secret-fixture-32-characters\n" +
        "TURNSTILE_SECRET_KEY=production-turnstile-secret-fixture\n" +
        "GITHUB_CLIENT_ID=production-client-id\n" +
        "GITHUB_CLIENT_SECRET=production-client-secret-fixture\n",
    );
    write(
      "frontend/.env.production.local",
      "BACKEND_URL=/api\nTURNSTILE_SITE_KEY=0xproduction-fixture\nAUTH_PROVIDERS=github\n",
    );
    write(
      "fixture-build.mjs",
      `import { appendFileSync } from 'node:fs';
const target = process.argv[2];
const args = process.argv.slice(3);
if (args.length > 0) throw new Error('Unexpected build arguments: ' + args.join(' '));
appendFileSync(new URL('./builds.jsonl', import.meta.url), JSON.stringify({
  target, args,
  backendUrl: process.env.BACKEND_URL,
  siteKey: process.env.TURNSTILE_SITE_KEY,
  providers: process.env.AUTH_PROVIDERS,
  authSecret: process.env.BETTER_AUTH_SECRET,
  turnstileSecret: process.env.TURNSTILE_SECRET_KEY,
}) + '\\n');
if (process.env.FIXTURE_FAIL_BUILD === target) process.exit(1);
`,
    );
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("runs frontend then backend through the real CLI without forwarding runner flags", () => {
    const result = run();
    expect(result.error).toBeUndefined();
    expect(result.status, result.stdout + result.stderr).toBe(0);
    expect(builds().map(({ target, args }) => ({ target, args }))).toEqual([
      { target: "frontend", args: [] },
      { target: "backend", args: [] },
    ]);
  }, 30_000);
});
