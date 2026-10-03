import { cleanup, render } from "@solidjs/testing-library";
import { afterEach, expect, it, vi } from "vite-plus/test";

import { SearchableSetting } from "../../../../src/ts/components/pages/settings/SearchableSetting";
import { SettingsSectionContext } from "../../../../src/ts/components/pages/settings/settings-section-context";
import {
  highlightSetting,
  setHighlightedSetting,
} from "../../../../src/ts/states/settings-highlight";
import {
  getCurrentSettingsSection,
  setCurrentSettingsSection,
} from "../../../../src/ts/states/settings-sections";

afterEach(() => {
  cleanup();
  setHighlightedSetting(null);
  setCurrentSettingsSection("behavior");
  vi.useRealTimers();
});

it("selects its section when deep linked", () => {
  vi.useFakeTimers();
  render(() => (
    <SettingsSectionContext.Provider value="theme">
      <SearchableSetting
        key="deepLinked"
        title="deep linked"
        description="test"
        fa={{ icon: "fa-cog" }}
      />
    </SettingsSectionContext.Provider>
  ));

  highlightSetting("deepLinked");

  expect(getCurrentSettingsSection()).toBe("theme");
});
