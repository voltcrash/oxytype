import { deepStrictEqual } from "node:assert";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parse } from "jsonc-parser";
import type { OxlintConfig } from "vite-plus/lint";

type RuleMap = NonNullable<OxlintConfig["rules"]>;

const root = new URL("../../", import.meta.url);
const cli = fileURLToPath(new URL("node_modules/vite-plus/bin/vp", root));
const defaultsFile = new URL("./application-defaults.jsonc", import.meta.url);

function readRules(directory: string): RuleMap {
  const config = JSON.parse(
    execFileSync(
      process.execPath,
      [cli, "lint", "--print-config", "--format", "agent"],
      { cwd: fileURLToPath(new URL(directory, root)), encoding: "utf8" },
    ),
  ) as { rules: RuleMap };
  return config.rules;
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
    `// App configs opt into shared rules; overrides cannot set categories.
// Regenerate after tool upgrades: pnpm lint-check-config --write
${JSON.stringify({ rules: defaults }, null, 2)}
`,
  );
  execFileSync(process.execPath, [cli, "fmt", fileURLToPath(defaultsFile)], {
    cwd: fileURLToPath(root),
    stdio: "inherit",
  });
} else {
  const actual = parse(readFileSync(defaultsFile, "utf8")) as {
    rules: RuleMap;
  };
  deepStrictEqual(
    actual.rules,
    defaults,
    "Scoped category exclusions changed; run pnpm lint-check-config --write",
  );
}
