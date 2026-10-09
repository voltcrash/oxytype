#!/usr/bin/env bun
import { supportsBun } from "../src/cli/bun-version";

if (typeof Bun === "undefined" || !supportsBun(Bun.version)) {
  console.error("Oxytype requires Bun >=1.3.0. Install: https://bun.sh");
  process.exitCode = 1;
} else {
  await import(new URL("../dist/index.js", import.meta.url).href);
}
