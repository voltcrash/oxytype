import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parse, type ParseError } from "jsonc-parser";
import type { OxlintConfig } from "vite-plus/lint";

type FileConfig = Omit<OxlintConfig, "extends"> & { extends?: string[] };

function loadConfig(url: URL): OxlintConfig {
  const errors: ParseError[] = [];
  const config = parse(readFileSync(url, "utf8"), errors, {
    allowTrailingComma: true,
  }) as FileConfig;

  if (errors.length > 0) {
    throw new Error(`Invalid Oxlint config: ${fileURLToPath(url)}`);
  }

  const { extends: files, jsPlugins, ...settings } = config;
  return {
    ...settings,
    ...(files
      ? { extends: files.map((file) => loadConfig(new URL(file, url))) }
      : {}),
    ...(jsPlugins
      ? {
          jsPlugins: jsPlugins.map((plugin) =>
            typeof plugin === "string" && plugin.startsWith(".")
              ? fileURLToPath(new URL(plugin, url))
              : plugin,
          ),
        }
      : {}),
  };
}

export const sharedLint = loadConfig(new URL("./index.jsonc", import.meta.url));
export const pluginLint = loadConfig(
  new URL("./plugin.jsonc", import.meta.url),
);
