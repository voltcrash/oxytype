import { homedir } from "node:os";
import { posix, win32 } from "node:path";

export const appName = "oxytype";

export type AppPaths = {
  /** User settings, e.g. `config.json`. */
  config: string;
  /** Re-downloadable assets such as languages and quotes. */
  cache: string;
  /** Local results, queued uploads and credentials. */
  data: string;
};

type Env = Record<string, string | undefined>;

export function resolvePaths(
  env: Env = process.env,
  platform: NodeJS.Platform = process.platform,
  home: string = homedir(),
): AppPaths {
  const path = platform === "win32" ? win32 : posix;

  // XDG base directories ignore unset, empty and relative values.
  const dir = (variable: string, fallback: string): string => {
    const value = env[variable];
    return value !== undefined && path.isAbsolute(value)
      ? path.join(value, appName)
      : fallback;
  };

  if (platform === "win32") {
    const roaming = env["APPDATA"] ?? path.join(home, "AppData", "Roaming");
    const local = env["LOCALAPPDATA"] ?? path.join(home, "AppData", "Local");
    return {
      config: dir("XDG_CONFIG_HOME", path.join(roaming, appName)),
      cache: dir("XDG_CACHE_HOME", path.join(local, appName, "cache")),
      data: dir("XDG_DATA_HOME", path.join(local, appName, "data")),
    };
  }

  return {
    config: dir("XDG_CONFIG_HOME", path.join(home, ".config", appName)),
    cache: dir("XDG_CACHE_HOME", path.join(home, ".cache", appName)),
    data: dir("XDG_DATA_HOME", path.join(home, ".local", "share", appName)),
  };
}
