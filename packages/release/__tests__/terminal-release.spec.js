import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import { parse } from "yaml";

import {
  getTerminalVersion,
  prepareTerminalRelease,
} from "../src/terminal-release.js";

let cwd;
let sha;
beforeEach(() => {
  cwd = mkdtempSync(join(tmpdir(), "oxytype-release-"));
  const git = (...args) =>
    execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
  git("init", "--quiet");
  git("config", "user.name", "Release Test");
  git("config", "user.email", "release@example.test");
  mkdirSync(join(cwd, "tui"));
  writeFileSync(
    join(cwd, "tui/package.json"),
    JSON.stringify({
      name: "@voltcrash/oxytype",
      private: true,
      version: "old",
    }),
  );
  git("add", ".");
  git("-c", "core.hooksPath=/dev/null", "commit", "--quiet", "-m", "test");
  sha = git("rev-parse", "HEAD");
});
afterEach(() => {
  rmSync(cwd, { recursive: true, force: true });
  vi.useRealTimers();
});

describe("terminal release", () => {
  it("normalizes padded production dates into npm semver", () => {
    expect(getTerminalVersion("v26.10.04")).toBe("26.10.4");
    expect(getTerminalVersion("26.01.02-rc.1")).toBe("26.1.2-rc.1");
    expect(getTerminalVersion("28.02.29")).toBe("28.2.29");
    for (const value of [
      "26.02.29",
      "26.13.1",
      "26.0.1",
      "26.1.0",
      "latest",
      "26.1.1-rc.0",
    ]) {
      expect(() => getTerminalVersion(value)).toThrow();
    }
  });
  it("defaults to the current UTC date and writes the package version", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-09T23:59:59Z"));
    const fetch = vi.fn(async () => new Response(null, { status: 404 }));
    expect(
      await prepareTerminalRelease({ cwd, sha, version: "", fetch }),
    ).toEqual({
      version: "26.10.9",
      sha,
      channel: "latest",
      shouldPublish: true,
    });
    expect(fetch.mock.calls[0][0]).toContain("/26.10.9");
    expect(
      JSON.parse(readFileSync(join(cwd, "tui/package.json"), "utf8")),
    ).toMatchObject({ private: true, version: "26.10.9" });
  });
  it("retries the same publication idempotently and rejects version collisions", async () => {
    const options = {
      cwd,
      sha,
      version: "26.10.09",
      fetch: async () => Response.json({ gitHead: sha }),
    };
    expect((await prepareTerminalRelease(options)).shouldPublish).toBe(false);
    await expect(
      prepareTerminalRelease({
        ...options,
        fetch: async () => Response.json({ gitHead: "other" }),
      }),
    ).rejects.toThrow("another commit");
  });
  it("rejects wrong checkouts, unsafe channels and registry errors", async () => {
    const options = {
      cwd,
      sha,
      version: "26.10.9",
      fetch: async () => new Response(null, { status: 404 }),
    };
    await expect(
      prepareTerminalRelease({ ...options, sha: "other" }),
    ).rejects.toThrow("workflow commit");
    await expect(
      prepareTerminalRelease({ ...options, version: "26.10.9-rc.1" }),
    ).rejects.toThrow("next");
    expect(
      (
        await prepareTerminalRelease({
          ...options,
          version: "26.10.9-rc.1",
          channel: "next",
        })
      ).version,
    ).toBe("26.10.9-rc.1");
    await expect(
      prepareTerminalRelease({ ...options, channel: "--unsafe" }),
    ).rejects.toThrow("channels");
    await expect(
      prepareTerminalRelease({
        ...options,
        fetch: async () => new Response(null, { status: 503 }),
      }),
    ).rejects.toThrow("503");
  });
});

it("publishes on main only, after validation and isolated package smoke", () => {
  const workflow = parse(
    readFileSync(
      fileURLToPath(
        new URL("../../../.github/workflows/tui-release.yml", import.meta.url),
      ),
      "utf8",
    ),
  );
  expect(Object.keys(workflow.on)).toEqual(["workflow_dispatch"]);
  expect(workflow.permissions["id-token"]).toBe("write");
  expect(workflow.concurrency["cancel-in-progress"]).toBe(false);
  expect(workflow.jobs.release.if).toBe("github.ref == 'refs/heads/main'");
  expect(workflow.jobs.release.environment).toBe("npm");
  const steps = workflow.jobs.release.steps;
  const publish = steps.at(-1);
  expect(publish.run).toContain(
    "npm publish ./tui/dist/npm --access public --provenance",
  );
  expect(publish.env.NODE_AUTH_TOKEN).toBe("${{ secrets.NPM_TOKEN }}");
  expect(publish.if).toBe("steps.plan.outputs.shouldPublish == 'true'");
  expect(steps.at(-2).run).toContain("package-check");
  expect(steps.at(-3).run).toContain("lint-tui");
});
