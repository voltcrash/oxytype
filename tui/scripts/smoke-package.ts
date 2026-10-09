import { execFileSync } from "node:child_process";
import {
  access,
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const directory = await mkdtemp(join(tmpdir(), "oxytype-npm-"));
const manifest = JSON.parse(
  await readFile(join(root, "dist/npm/package.json"), "utf8"),
) as { version: string };
try {
  // Direct npm: pack and install the way end users get the published package.
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
  const tools = join(directory, "tools");
  await mkdir(tools);
  await symlink(process.execPath, join(tools, "bun"));
  const browser = join(
    tools,
    process.platform === "darwin" ? "open" : "xdg-open",
  );
  await writeFile(browser, "#!/bin/sh\nexit 0\n");
  await chmod(browser, 0o755);
  const env = {
    ...process.env,
    XDG_CONFIG_HOME: join(directory, "config"),
    XDG_DATA_HOME: join(directory, "data"),
    XDG_CACHE_HOME: join(directory, "cache"),
    PATH: `${tools}:${process.env["PATH"] ?? ""}`,
  };
  const cli = async (
    args: string[],
    extra: Record<string, string> = {},
    bunx = false,
  ): Promise<{ status: number; output: string }> => {
    const child = Bun.spawn(
      bunx
        ? [process.execPath, "x", "--no-install", "@voltcrash/oxytype", ...args]
        : [process.execPath, binary, ...args],
      {
        cwd: directory,
        env: { ...env, ...extra },
        stdin: "ignore",
        stdout: "pipe",
        stderr: "pipe",
      },
    );
    const timer = setTimeout(() => child.kill(), 15_000);
    try {
      const [status, stdout, stderr] = await Promise.all([
        child.exited,
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
      ]);
      return { status, output: stdout + stderr };
    } finally {
      clearTimeout(timer);
    }
  };
  const version = await cli(["--version"]);
  const help = await cli(["--help"]);
  const bad = await cli(["--mode", "invalid"]);
  const pipe = await cli([]);
  const bunx = await cli(["--version"], {}, true);
  if (
    version.status !== 0 ||
    !version.output.includes(manifest.version) ||
    help.status !== 0 ||
    !help.output.includes("--debug") ||
    bad.status !== 2 ||
    pipe.status !== 2 ||
    bunx.status !== 0 ||
    !bunx.output.includes(manifest.version)
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
  const server = Bun.serve({
    port: 0,
    fetch: (request): Response => {
      const path = new URL(request.url).pathname;
      if (path.endsWith("/device/code")) {
        return Response.json({
          device_code: "private-device",
          user_code: "ABCD-1234",
          verification_uri: `${server.url}device`,
          expires_in: 60,
          interval: 1,
        });
      }
      if (path.endsWith("/device/token")) {
        return Response.json({
          access_token: "private-token",
          token_type: "Bearer",
          expires_in: 3600,
        });
      }
      if (path.endsWith("/get-session")) {
        return Response.json({
          session: { expiresAt: new Date(Date.now() + 3600_000).toISOString() },
          user: { id: "test-user", name: "Tester" },
        });
      }
      return Response.json({ message: "ok", data: {} });
    },
  });
  try {
    const network = { OXYTYPE_API_URL: `${server.url}api` };
    const login = await cli(["login", "--debug"], network);
    if (
      login.status !== 0 ||
      !login.output.includes("Code: ABCD-1234") ||
      !login.output.includes("Logged in")
    ) {
      throw new Error(`Packaged device login failed: ${login.output}`);
    }
    const revoked = await cli(["logout"], network);
    if (
      revoked.status !== 0 ||
      (await access(join(env.XDG_DATA_HOME, "oxytype/credentials.json")).then(
        () => true,
        () => false,
      ))
    ) {
      throw new Error("Packaged session revocation failed");
    }
    if (
      (
        await readFile(join(env.XDG_DATA_HOME, "oxytype/oxytype.log"), "utf8")
      ).includes("private-")
    ) {
      throw new Error(
        "Packaged diagnostics leaked private device/session data",
      );
    }
  } finally {
    await server.stop(true);
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
      login: true,
      bunx: true,
      logs: true,
      rawPty: true,
    }),
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}
