import { execFileSync } from "node:child_process";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const directory = await mkdtemp(join(tmpdir(), "oxytype-npm-"));
const manifest = JSON.parse(
  await readFile(join(root, "dist/npm/package.json"), "utf8"),
) as { version: string };
try {
  const packed = JSON.parse(
    execFileSync(
      "npm",
      [
        "pack",
        join(root, "dist/npm"),
        "--pack-destination",
        directory,
        "--json",
      ],
      { encoding: "utf8" },
    ),
  ) as { filename: string; files: { path: string }[] }[];
  const archive = packed[0];
  if (archive === undefined) {
    throw new Error("npm pack did not produce an archive");
  }
  const files = archive.files.map((file) => file.path);
  for (const required of [
    "bin/oxytype.js",
    "dist/index.js",
    "assets/languages/english.json",
    "assets/quotes/english.json",
    "assets/layouts/qwerty.json",
    "LICENSE",
    "THIRD_PARTY_NOTICES.txt",
  ]) {
    if (!files.includes(required)) {
      throw new Error(`Package is missing ${required}`);
    }
  }
  for (const file of files) {
    if (
      !/^(bin\/|dist\/|assets\/|package\.json$|README\.md$|MISSING\.md$|LICENSE$|THIRD_PARTY_NOTICES\.txt$)/.test(
        file,
      )
    ) {
      throw new Error(`Unexpected package file: ${file}`);
    }
  }
  execFileSync(
    "npm",
    [
      "install",
      join(directory, archive.filename),
      "--prefix",
      directory,
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--package-lock=false",
    ],
    { encoding: "utf8" },
  );
  const binary = join(
    directory,
    "node_modules/@voltcrash/oxytype/bin/oxytype.js",
  );
  const env = {
    ...process.env,
    XDG_CONFIG_HOME: join(directory, "config"),
    XDG_DATA_HOME: join(directory, "data"),
    XDG_CACHE_HOME: join(directory, "cache"),
  };
  const cli = async (
    args: string[],
    extra: Record<string, string> = {},
  ): Promise<{ status: number; output: string }> => {
    const child = Bun.spawn([process.execPath, binary, ...args], {
      cwd: directory,
      env: { ...env, ...extra },
      stdin: "ignore",
      stdout: "pipe",
      stderr: "pipe",
    });
    const [status, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ]);
    return { status, output: stdout + stderr };
  };
  const version = await cli(["--version"]);
  const help = await cli(["--help"]);
  const bad = await cli(["--mode", "invalid"]);
  const pipe = await cli([]);
  if (
    version.status !== 0 ||
    !version.output.includes(manifest.version) ||
    help.status !== 0 ||
    !help.output.includes("--debug") ||
    bad.status !== 2 ||
    pipe.status !== 2
  ) {
    throw new Error("Packaged CLI flags failed");
  }
  if (
    await access(env.XDG_CONFIG_HOME).then(
      () => true,
      () => false,
    )
  ) {
    throw new Error("Informational flags wrote user data");
  }
  const logout = await cli(["logout", "--debug"]);
  if (logout.status !== 0 || !logout.output.includes("Logged out")) {
    throw new Error("Packaged logout failed");
  }
  const logs = await readFile(
    join(env.XDG_DATA_HOME, "oxytype/oxytype.log"),
    "utf8",
  );
  if (!logs.includes('"event":"shutdown"')) {
    throw new Error("Packaged logs were not flushed");
  }
  execFileSync("python3", [join(root, "scripts/smoke-pty.py")], {
    env: {
      ...env,
      OXYTYPE_SMOKE_BIN: binary,
      OXYTYPE_SMOKE_BUN: process.execPath,
    },
    encoding: "utf8",
  });
  console.log(
    JSON.stringify({
      package: `@voltcrash/oxytype@${manifest.version}`,
      files: files.length,
      isolatedInstall: true,
      flags: true,
      logout: true,
      logs: true,
      rawPty: true,
    }),
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}
