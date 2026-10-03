import { access, cp, readdir, readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";

async function main(): Promise<void> {
  const root = resolve(__dirname, "..");
  const frontend = resolve(root, "../frontend/dist");
  await access(resolve(root, "dist/assets/docs"));
  await access(resolve(frontend, "index.html"));
  await access(resolve(frontend, "oauth-callback.html"));
  const scripts = await readdir(resolve(frontend, "js"));
  const bundles = await Promise.all(
    scripts
      .filter((file) => file.endsWith(".js"))
      .map(
        async (file) => await readFile(resolve(frontend, "js", file), "utf8"),
      ),
  );
  if (
    !bundles.some((content) => /backendUrl\s*:\s*["'`]\/api["'`]/.test(content))
  ) {
    throw new Error(
      "Build the frontend with BACKEND_URL=/api before publishing the same-origin site",
    );
  }
  const site = resolve(root, "dist/assets/site");
  await rm(site, { recursive: true, force: true });
  await cp(frontend, site, { recursive: true });
  console.log("Frontend copied into Worker site assets");
}
void main();
