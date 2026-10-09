import { describe, expect, test } from "bun:test";
import { resolvePaths } from "../src/storage/paths";

describe("resolvePaths", () => {
  test("uses XDG defaults on Linux and macOS", () => {
    for (const platform of ["linux", "darwin"] as const) {
      expect(resolvePaths({}, platform, "/home/ana")).toEqual({
        config: "/home/ana/.config/oxytype",
        cache: "/home/ana/.cache/oxytype",
        data: "/home/ana/.local/share/oxytype",
      });
    }
  });

  test("honours absolute XDG overrides", () => {
    const env = {
      XDG_CONFIG_HOME: "/xdg/config",
      XDG_CACHE_HOME: "/xdg/cache",
      XDG_DATA_HOME: "/xdg/data",
    };
    expect(resolvePaths(env, "linux", "/home/ana")).toEqual({
      config: "/xdg/config/oxytype",
      cache: "/xdg/cache/oxytype",
      data: "/xdg/data/oxytype",
    });
  });

  test("ignores empty and relative XDG values", () => {
    const env = { XDG_CONFIG_HOME: "", XDG_CACHE_HOME: "relative/cache" };
    const paths = resolvePaths(env, "linux", "/home/ana");
    expect(paths.config).toBe("/home/ana/.config/oxytype");
    expect(paths.cache).toBe("/home/ana/.cache/oxytype");
  });

  test("uses AppData on Windows", () => {
    const env = {
      APPDATA: "C:\\Users\\ana\\AppData\\Roaming",
      LOCALAPPDATA: "C:\\Users\\ana\\AppData\\Local",
    };
    expect(resolvePaths(env, "win32", "C:\\Users\\ana")).toEqual({
      config: "C:\\Users\\ana\\AppData\\Roaming\\oxytype",
      cache: "C:\\Users\\ana\\AppData\\Local\\oxytype\\cache",
      data: "C:\\Users\\ana\\AppData\\Local\\oxytype\\data",
    });
    expect(resolvePaths({}, "win32", "C:\\Users\\ana").config).toBe(
      "C:\\Users\\ana\\AppData\\Roaming\\oxytype",
    );
  });
});
