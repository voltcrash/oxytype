import { execFileSync } from "node:child_process";

export function getReleaseVersion(date = new Date()) {
  return `v${date.toISOString().slice(0, 10).replaceAll("-", ".")}`;
}

export function assertReleaseTagAvailable(version, cwd) {
  const options = { cwd, encoding: "utf8" };
  const localTag = execFileSync(
    "git",
    ["tag", "--list", version],
    options,
  ).trim();
  if (localTag !== "") {
    throw new Error(
      `Release ${version} already exists locally. Use pnpm hotfix for another deployment today, or release on a later UTC date.`,
    );
  }

  const remoteTag = execFileSync(
    "git",
    ["ls-remote", "--tags", "origin", `refs/tags/${version}`],
    options,
  ).trim();
  if (remoteTag !== "") {
    throw new Error(
      `Release ${version} already exists on origin. Use pnpm hotfix for another deployment today, or release on a later UTC date.`,
    );
  }
}
