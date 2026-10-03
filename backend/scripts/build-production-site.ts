import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseEnv } from "node:util";
import { validateProductionInputs } from "./production-inputs";

async function main(): Promise<void> {
  const backendRoot = resolve(__dirname, "..");
  const frontend = parseEnv(
    await readFile(
      resolve(backendRoot, "../frontend/.env.production.local"),
      "utf8",
    ),
  );
  const backend = parseEnv(
    await readFile(resolve(backendRoot, ".dev.vars.production"), "utf8"),
  );
  const config: unknown = JSON.parse(
    await readFile(resolve(backendRoot, "wrangler.production.json"), "utf8"),
  );
  validateProductionInputs({ config, backend, frontend });

  // Only public build settings are forwarded; backend secrets stay in their file.
  const env = {
    ...process.env,
    BACKEND_URL: frontend["BACKEND_URL"],
    TURNSTILE_SITE_KEY: frontend["TURNSTILE_SITE_KEY"],
    AUTH_PROVIDERS: frontend["AUTH_PROVIDERS"],
  };
  // Shared package builds clean their output directories, so build sequentially.
  for (const script of ["build-fe", "build-be"]) {
    const result = spawnSync("pnpm", [script, "--force"], {
      cwd: resolve(backendRoot, ".."),
      env,
      stdio: "inherit",
    });
    if (result.error !== undefined || result.status !== 0) {
      throw new Error(`${script} failed; production was not deployed`);
    }
  }
}

void main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Production build failed",
  );
  process.exitCode = 1;
});
