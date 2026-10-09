// Copies offline assets from the web static files; tui/assets is generated.
import { copyFile, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const bundledAssets = [
  "languages/english.json",
  "quotes/english.json",
] as const;

const root = fileURLToPath(new URL("..", import.meta.url));
const source = join(root, "..", "frontend", "static");
const target = join(root, "assets");

await rm(target, { recursive: true, force: true });
for (const asset of bundledAssets) {
  await mkdir(dirname(join(target, asset)), { recursive: true });
  await copyFile(join(source, asset), join(target, asset));
}
