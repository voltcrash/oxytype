import { cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
async function main(): Promise<void> {
  const root = resolve(__dirname, "..");
  const assets = resolve(root, "dist/assets");
  await rm(assets, { recursive: true, force: true });
  await mkdir(assets, { recursive: true });
  await cp(resolve(root, "dist/static/api"), resolve(assets, "docs"), {
    recursive: true,
  });
  await cp(resolve(root, "private"), resolve(assets, "configure"), {
    recursive: true,
  });
  await cp(
    resolve(root, "../frontend/static/quotes"),
    resolve(assets, "quotes"),
    { recursive: true },
  );
}
void main();
