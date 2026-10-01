import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const icons = JSON.parse(
  readFileSync(
    require.resolve("@fortawesome/fontawesome-free/metadata/icon-families.json"),
    "utf8",
  ),
) as Record<
  string,
  {
    aliases?: { names?: string[] };
    familyStylesByLicense: { free: { family: string; style: string }[] };
  }
>;

const target = new URL("../src/ts/types/font-awesome.d.ts", import.meta.url);
const header = readFileSync(target, "utf8").split("// fa- prefix")[0];
const definitions = ["brand", "regular", "solid"].map((variant) => {
  const names = new Set(
    Object.entries(icons).flatMap(([name, icon]) =>
      icon.familyStylesByLicense.free.some(
        ({ family, style }) =>
          family === "classic" &&
          style === (variant === "brand" ? "brands" : variant),
      )
        ? [name, ...(icon.aliases?.names ?? [])]
        : [],
    ),
  );
  const typeName = variant[0]?.toUpperCase() + variant.slice(1);
  return `export type Fa${typeName}Icon =\n${[...names]
    .sort()
    .map((name) => `  | "fa-${name}"`)
    .join("\n")};`;
});
writeFileSync(
  target,
  `${header}// fa- prefix is required by the icon components.\n\n${definitions.join("\n\n")}\n`,
);
