import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import {
  assertReleaseTagAvailable,
  getReleaseVersion,
} from "../src/version.js";

describe("release dates", () => {
  afterEach(() => vi.useRealTimers());

  it.each([
    ["2000-01-01T00:00:00Z", "v00.01.01"],
    ["2006-10-07T12:00:00Z", "v06.10.07"],
    ["2009-12-31T23:59:59Z", "v09.12.31"],
    ["2010-01-01T00:00:00Z", "v10.01.01"],
    ["2026-10-04T12:00:00Z", "v26.10.04"],
    ["2026-01-01T00:00:00Z", "v26.01.01"],
    ["2026-12-31T23:59:59Z", "v26.12.31"],
    ["2027-01-01T00:00:00Z", "v27.01.01"],
    ["2028-02-29T12:00:00Z", "v28.02.29"],
    ["2026-10-04T00:30:00+05:30", "v26.10.03"],
    ["2026-10-04T23:30:00-07:00", "v26.10.05"],
  ])("formats %s as %s", (date, expected) => {
    expect(getReleaseVersion(new Date(date))).toBe(expected);
  });

  it("uses the current date when no date is supplied", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-04T12:00:00Z"));
    expect(getReleaseVersion()).toBe("v26.10.04");
  });
});

describe("release tag availability", () => {
  let directory;
  let repository;

  function git(...args) {
    return execFileSync("git", args, { cwd: repository, encoding: "utf8" });
  }

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), "oxytype-release-"));
    repository = join(directory, "repository");
    mkdirSync(repository);
    git("init", "--quiet");
    git("config", "user.name", "Release Tests");
    git("config", "user.email", "release-tests@example.com");
    git("config", "commit.gpgsign", "false");
    git("config", "tag.gpgsign", "false");
    git("commit", "--quiet", "--allow-empty", "-m", "Initial commit");
    const origin = join(directory, "origin.git");
    git("init", "--quiet", "--bare", origin);
    git("remote", "add", "origin", origin);
  });

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  it("allows today's first tag even when legacy and earlier date tags exist", () => {
    git("tag", "v26.32.0");
    git("tag", "v26.10.03");
    git("push", "--quiet", "origin", "--tags");
    expect(() =>
      assertReleaseTagAvailable("v26.10.04", repository),
    ).not.toThrow();
  });

  it("rejects an existing local tag", () => {
    git("tag", "v26.10.04");
    expect(() => assertReleaseTagAvailable("v26.10.04", repository)).toThrow(
      /already exists locally.*pnpm hotfix/,
    );
  });

  it("rejects an existing remote tag that is absent locally", () => {
    git("tag", "-a", "v26.10.04", "-m", "Release");
    git("push", "--quiet", "origin", "refs/tags/v26.10.04");
    git("tag", "-d", "v26.10.04");
    expect(() => assertReleaseTagAvailable("v26.10.04", repository)).toThrow(
      /already exists on origin.*pnpm hotfix/,
    );
  });
});
