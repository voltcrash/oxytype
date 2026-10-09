import solidPlugin from "@opentui/solid/bun-plugin";
import { execFileSync } from "node:child_process";
import {
  chmod,
  copyFile,
  cp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import metadata from "../package.json";

const root = fileURLToPath(new URL("..", import.meta.url));
const target = join(root, "dist", "npm");
await rm(target, { recursive: true, force: true });
await mkdir(join(target, "bin"), { recursive: true });
const built = await Bun.build({
  entrypoints: [join(root, "src", "index.tsx")],
  outdir: join(target, "dist"),
  target: "bun",
  format: "esm",
  splitting: true,
  sourcemap: "linked",
  plugins: [solidPlugin],
  external: ["@opentui/core"],
  metafile: true,
  define: {
    __OXYTYPE_PACKAGED__: "true",
  },
});
if (!built.success) {
  throw new AggregateError(built.logs, "Terminal build failed");
}

const manifest = {
  name: metadata.name,
  version: metadata.version,
  gitHead: execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim(),
  description:
    "Oxytype typing tests in your terminal. Same account, offline play, Bun + OpenTUI.",
  license: metadata.license,
  type: "module",
  bin: { oxytype: "bin/oxytype.js" },
  engines: metadata.engines,
  files: [
    "bin/",
    "dist/",
    "assets/",
    "README.md",
    "MISSING.md",
    "LICENSE",
    "THIRD_PARTY_NOTICES.txt",
  ],
  repository: {
    type: "git",
    url: "git+https://github.com/voltcrash/oxytype.git",
    directory: "tui",
  },
  bugs: { url: "https://github.com/voltcrash/oxytype/issues" },
  homepage: "https://github.com/voltcrash/oxytype/blob/main/docs/TUI.md",
  publishConfig: { access: "public" },
  dependencies: { "@opentui/core": metadata.dependencies["@opentui/core"] },
};
await writeFile(
  join(target, "package.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
const launcher = await Bun.build({
  entrypoints: [join(root, "bin", "oxytype.ts")],
  outdir: join(target, "bin"),
  target: "bun",
});
if (!launcher.success) {
  throw new AggregateError(launcher.logs, "Launcher build failed");
}
await chmod(join(target, "bin", "oxytype.js"), 0o755);
for (const file of ["README.md", "MISSING.md"]) {
  await copyFile(join(root, file), join(target, file));
}
await copyFile(join(root, "..", "LICENSE"), join(target, "LICENSE"));
await cp(join(root, "assets"), join(target, "assets"), { recursive: true });

// Preserve notices from the packages actually included in the bundle.
const packageRoots = new Set<string>();
for (const input of Object.keys(built.metafile?.inputs ?? {})) {
  const absolute = resolve(input);
  const marker = `${process.platform === "win32" ? "\\" : "/"}node_modules${process.platform === "win32" ? "\\" : "/"}`;
  const at = absolute.lastIndexOf(marker);
  if (at === -1) continue;
  const tail = absolute.slice(at + marker.length).split(/[\\/]/);
  const count = tail[0]?.startsWith("@") ? 2 : 1;
  packageRoots.add(
    join(absolute.slice(0, at + marker.length), ...tail.slice(0, count)),
  );
}
const notices: string[] = [];
for (const directory of [...packageRoots].sort()) {
  const pkg = JSON.parse(
    await readFile(join(directory, "package.json"), "utf8"),
  ) as { name: string; version: string };
  const files = (await readdir(directory)).filter((file) =>
    /^(licen[cs]e|copying|notice)(\.|$)/i.test(file),
  );
  if (files.length === 0) {
    throw new Error(`No license notice found for bundled ${pkg.name}`);
  }
  notices.push(
    `${pkg.name}@${pkg.version}\n${"=".repeat(60)}\n${(await Promise.all(files.map(async (file) => readFile(join(directory, file), "utf8")))).join("\n")}`,
  );
}
await writeFile(
  join(target, "THIRD_PARTY_NOTICES.txt"),
  `${notices.join("\n\n")}\n`,
);
console.log(`Built ${manifest.name}@${manifest.version} in ${target}`);
