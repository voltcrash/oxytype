import { deepStrictEqual } from "node:assert";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parse } from "jsonc-parser";

const root = new URL("../../", import.meta.url);
const cli = fileURLToPath(new URL("node_modules/vite-plus/bin/vp", root));
const defaultsFile = new URL("./application-defaults.jsonc", import.meta.url);

function readRules(directory) {
  return JSON.parse(
    execFileSync(
      process.execPath,
      [cli, "lint", "--print-config", "--format", "agent"],
      { cwd: fileURLToPath(new URL(directory, root)), encoding: "utf8" },
    ),
  ).rules;
}

const rootRules = readRules("./");
const frontendRules = readRules("frontend/");
const backendRules = readRules("backend/");
const defaults = Object.fromEntries(
  Object.keys(rootRules)
    .filter((rule) => !Object.hasOwn(frontendRules, rule))
    .map((rule) => [rule, "off"]),
);
const backendDefaults = Object.fromEntries(
  Object.keys(rootRules)
    .filter((rule) => !Object.hasOwn(backendRules, rule))
    .map((rule) => [rule, "off"]),
);
deepStrictEqual(defaults, backendDefaults);

if (process.argv.includes("--write")) {
  writeFileSync(
    defaultsFile,
    "// App configs opt into shared rules; overrides cannot set categories.\n" +
      "// Regenerate after tool upgrades: pnpm lint-check-config --write\n" +
      JSON.stringify({ rules: defaults }, null, 2) +
      "\n",
  );
  execFileSync(process.execPath, [cli, "fmt", fileURLToPath(defaultsFile)], {
    cwd: fileURLToPath(root),
    stdio: "inherit",
  });
} else {
  deepStrictEqual(
    parse(readFileSync(defaultsFile, "utf8")).rules,
    defaults,
    "Scoped category exclusions changed; run pnpm lint-check-config --write",
  );
}
