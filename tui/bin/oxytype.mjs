#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// npm's bin shim runs Node; bunx may run this directly in Bun.
const minimum = [1, 3, 0];
const version = spawnSync("bun", ["--version"], { encoding: "utf8" });
const parts = version.stdout?.trim().split(".").map(Number);
const supported =
  version.status === 0 &&
  parts?.length >= 3 &&
  parts.slice(0, 3).every(Number.isInteger) &&
  (parts[0] > minimum[0] ||
    (parts[0] === minimum[0] &&
      (parts[1] > minimum[1] ||
        (parts[1] === minimum[1] && parts[2] >= minimum[2]))));
if (!supported) {
  console.error(
    "Oxytype requires Bun >=1.3.0 on PATH. Install: https://bun.sh",
  );
  process.exitCode = 1;
} else {
  const result = spawnSync(
    "bun",
    [
      join(dirname(fileURLToPath(import.meta.url)), "..", "dist", "index.js"),
      ...process.argv.slice(2),
    ],
    { stdio: "inherit" },
  );
  if (result.error) {
    console.error("Could not start Bun:", result.error.message);
    process.exitCode = 1;
  } else {
    process.exitCode = result.status ?? (result.signal === "SIGINT" ? 130 : 1);
  }
}
