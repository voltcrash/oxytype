import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach } from "bun:test";

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map(async (dir) => rm(dir, { recursive: true })),
  );
});

export async function tempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "oxytype-tui-"));
  directories.push(dir);
  return dir;
}
