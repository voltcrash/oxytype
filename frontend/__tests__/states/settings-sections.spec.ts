import { afterEach, describe, expect, it } from "vite-plus/test";

import {
  getCurrentSettingsSection,
  readSettingsGetParameters,
  setCurrentSettingsSection,
  SettingsUrlParamsSchema,
} from "../../src/ts/states/settings-sections";

afterEach(() => {
  setCurrentSettingsSection("behavior");
});

describe("settings sections", () => {
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
