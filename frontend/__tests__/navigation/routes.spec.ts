import { describe, expect, it } from "vite-plus/test";

import { getPageForPath } from "../../src/ts/navigation/routes";

describe("getPageForPath", () => {
  it.each([
    ["/", "test"],
    ["/settings", "settings"],
    ["/settings/", "settings"],
    ["/account-settings", "settings"],
    ["/device", "device"],
    ["/device/", "device"],
    ["/profile", "profileSearch"],
    ["/profile/typer", "profile"],
    ["/leaderboards", "leaderboards"],
    ["/profile/typer/extra", "404"],
    ["/nope", "404"],
  ] as const)("maps %s to %s", (path, page) => {
    expect(getPageForPath(path)).toBe(page);
  });
});
