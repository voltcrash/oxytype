import { afterEach, describe, expect, it } from "vite-plus/test";

import { setUserId } from "../../src/ts/states/core";
import {
  getAvailableSettingsSections,
  getCurrentSettingsSection,
  readSettingsGetParameters,
  setCurrentSettingsSection,
  SettingsUrlParamsSchema,
} from "../../src/ts/states/settings-sections";

afterEach(() => {
  setUserId(null);
  setCurrentSettingsSection("behavior");
});

describe("settings sections", () => {
  const accountSections = [
    "account",
    "authentication",
    "blockedUsers",
    "apeKeys",
  ] as const;

  it.each(accountSections)("accepts signed-in %s section links", (tab) => {
    setUserId("settings-user");
    expect(SettingsUrlParamsSchema.parse({ tab })).toEqual({ tab });
    readSettingsGetParameters({ tab });
    expect(getCurrentSettingsSection()).toBe(tab);
    expect(getAvailableSettingsSections()).toHaveProperty(tab);
  });

  it.each(accountSections)(
    "hides signed-out %s sections and falls back for links",
    (tab) => {
      setUserId(null);
      expect(getAvailableSettingsSections()).not.toHaveProperty(tab);
      readSettingsGetParameters({ tab });
      expect(getCurrentSettingsSection()).toBe("behavior");
    },
  );

  it.each(accountSections)(
    "returns to general settings after signing out of %s",
    async (tab) => {
      setUserId("settings-user");
      readSettingsGetParameters({ tab });
      setUserId(null);
      await Promise.resolve();
      expect(getCurrentSettingsSection()).toBe("behavior");
    },
  );

  it("keeps the shared danger zone available without an account", () => {
    setUserId(null);
    readSettingsGetParameters({ tab: "dangerZone" });
    expect(getCurrentSettingsSection()).toBe("dangerZone");
    expect(getAvailableSettingsSections()).toHaveProperty("dangerZone");
  });

  it("selects the section from the url params", () => {
    readSettingsGetParameters({ tab: "theme" });
    expect(getCurrentSettingsSection()).toBe("theme");
  });

  it("keeps the current section without a tab param", () => {
    setCurrentSettingsSection("caret");
    readSettingsGetParameters(undefined);
    readSettingsGetParameters({});
    expect(getCurrentSettingsSection()).toBe("caret");
  });

  it("accepts known sections and ignores other params", () => {
    expect(
      SettingsUrlParamsSchema.parse({ tab: "sound", highlight: "x" }),
    ).toEqual({ tab: "sound" });
    expect(SettingsUrlParamsSchema.safeParse({ tab: "nope" }).success).toBe(
      false,
    );
  });
});
