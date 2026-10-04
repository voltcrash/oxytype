import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, it } from "vite-plus/test";

const require = createRequire(import.meta.url);
const fontAwesome = readFileSync(
  require.resolve("@fortawesome/fontawesome-free/css/fontawesome.css"),
  "utf8",
);
const icons = readFileSync(
  path.join(import.meta.dirname, "../../src/styles/icons.css"),
  "utf8",
);

describe("icon size corrections", () => {
  const selectors = [...icons.matchAll(/\.(fa-[a-z0-9-]+)/g)].map(
    (match) => match[1] as string,
  );

  it("has corrections", () => {
    expect(selectors.length).toBeGreaterThan(0);
  });

  it.each(selectors)("targets a font awesome icon (%s)", (selector) => {
    expect(fontAwesome).toMatch(new RegExp(`\\.${selector}\\s*[{,]`));
  });

  it("only uses scale so layout and spin transforms are untouched", () => {
    const properties = [...icons.matchAll(/^\s+([a-z-]+):/gm)].map(
      (match) => match[1],
    );
    expect(new Set(properties)).toEqual(new Set(["scale"]));
  });
});
