import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { parseEnv } from "node:util";
import { validateProductionInputs } from "./production-inputs";

async function main(): Promise<void> {
  const root = resolve(__dirname, "..");
  const backend = parseEnv(
    await readFile(resolve(root, ".dev.vars.production"), "utf8"),
  );
  const frontend = parseEnv(
    await readFile(resolve(root, "../frontend/.env.production.local"), "utf8"),
  );
  const config: unknown = JSON.parse(
    await readFile(resolve(root, "wrangler.production.json"), "utf8"),
  );
  let staging: NodeJS.Dict<string> | undefined;
  try {
    staging = parseEnv(
      await readFile(resolve(root, ".dev.vars.staging"), "utf8"),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const directory = resolve(root, "../frontend/dist/js");
  const bundles = await Promise.all(
    (await readdir(directory))
      .filter((file) => file.endsWith(".js"))
      .map(async (file) => await readFile(resolve(directory, file), "utf8")),
  );
  validateProductionInputs({ config, backend, frontend, staging, bundles });
  console.log(
    "Production configuration, credentials and frontend build checked",
  );
}

void main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Production checks failed",
  );
  process.exitCode = 1;
});
