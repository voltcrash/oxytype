import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, it } from "vite-plus/test";
import type { ResolvedConfig } from "vite";

import { Fonts } from "../../src/ts/constants/fonts";
import { fontStyles } from "../../vite-plugins/font-styles";

async function generate(isDevelopment: boolean): Promise<{
  css: Map<string, string>;
  files: string[];
}> {
  const plugin = fontStyles({ isDevelopment });
  const config = plugin.config;
  const resolved = plugin.configResolved;
  if (typeof config !== "function" || typeof resolved !== "function") {
    throw new Error("Missing config hooks");
  }
  const result = await config.call(
    {} as never,
    {},
    {
      command: "serve",
      mode: "development",
    },
  );
  await resolved.call({} as never, {} as ResolvedConfig);
  const aliases = result?.resolve?.alias;
  if (aliases === undefined || Array.isArray(aliases)) {
    throw new Error("Missing CSS aliases");
  }
  const files = Object.values(aliases);
  return {
    files,
    css: new Map(
      files.map((file) => [path.basename(file), readFileSync(file, "utf8")]),
    ),
  };
}

it.each([true, false])(
  "preserves font families, weights, and preview URLs (development=%s)",
  async (isDevelopment) => {
    const css = (await generate(isDevelopment)).css.get("fonts.css") ?? "";
    const faces = new Map(
      [...css.matchAll(/@font-face\s*{([^}]+)}/g)].map((match) => [
        match[1]?.match(/font-family: "([^"]+)"/)?.[1],
        match[1] ?? "",
      ]),
    );
    expect(faces.has("Vazirharf")).toBe(true);
    for (const [name, font] of Object.entries(Fonts)) {
      const family = name.replaceAll("_", " ");
      if (font.systemFont) {
        expect(faces.has(family)).toBe(false);
        continue;
      }
      expect(faces.get(family)).toContain(
        `font-weight: ${font.weight ?? 400};`,
      );
      expect(faces.get(family)).toContain(`url("/webfonts/${font.fileName}")`);
      expect(faces.get(`${family} Preview`)).toContain(
        `url("/${isDevelopment ? "webfonts" : "webfonts-preview"}/${font.fileName}")`,
      );
    }
  },
);

it("uses full icon fonts in development and generated subsets in production", async () => {
  const development = (await generate(true)).css.get("fontawesome.css") ?? "";
  const production = (await generate(false)).css.get("fontawesome.css") ?? "";
  for (const file of [
    "fa-solid-900.woff2",
    "fa-regular-400.woff2",
    "fa-brands-400.woff2",
  ]) {
    expect(development).toContain(`webfonts/${file}`);
    expect(production).toContain(`/webfonts-generated/${file}`);
  }
  expect(development).not.toContain("/webfonts-generated/");
  expect(production).not.toContain("../webfonts/");
  expect(production).not.toContain("fa-v4compatibility.woff2");
});

it("keeps development and production CSS separate", async () => {
  const development = (await generate(true)).files;
  const production = (await generate(false)).files;
  expect(development).toHaveLength(2);
  expect(production).toHaveLength(2);
  expect(
    development.every((file) => file.includes("/generated/development/")),
  ).toBe(true);
  expect(
    production.every((file) => file.includes("/generated/production/")),
  ).toBe(true);
  expect(production.some((file) => development.includes(file))).toBe(false);
});
