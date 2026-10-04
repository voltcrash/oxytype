import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";

import "../../../__harness__/mock-static";
import { AuthenticationTab } from "../../../../src/ts/components/pages/account-settings/AuthenticationTab";
import { Section } from "../../../../src/ts/components/pages/account-settings/utils";
import { SettingsSectionContext } from "../../../../src/ts/components/pages/settings/settings-section-context";
import { setUserId } from "../../../../src/ts/states/core";
import { highlightSetting } from "../../../../src/ts/states/settings-highlight";
import {
  getSearchMatchCounts,
  setSettingsSearch,
} from "../../../../src/ts/states/settings-search";
import {
  getCurrentSettingsSection,
  setCurrentSettingsSection,
} from "../../../../src/ts/states/settings-sections";

vi.mock(
  "../../../../src/ts/components/modals/account-settings/ReauthConfirmModals",
  () => ({
    showRevokeAllTokensModal: vi.fn(),
  }),
);
vi.mock(
  "../../../../src/ts/components/modals/account-settings/RemoveAuthMethodModal",
  () => ({
    showRemoveAuthMethodModal: vi.fn(),
  }),
);

beforeEach(() => setUserId("settings-user"));
afterEach(() => {
  cleanup();
  setUserId(null);
  setCurrentSettingsSection("behavior");
  setSettingsSearch("");
  vi.useRealTimers();
});

it("searches account descriptions and counts matches in the main sidebar", () => {
  const { container } = render(() => (
    <SettingsSectionContext.Provider value="account">
      <Section
        key="streakHourOffset"
        title="hour offset"
        fa={{ icon: "fa-clock" }}
        description={<>Choose when your streak resets.</>}
      />
      <Section
        key="accountName"
        title="account name"
        fa={{ icon: "fa-user" }}
        description="Change your display name."
      />
    </SettingsSectionContext.Provider>
  ));
  setSettingsSearch("streak");
  expect(
    container.querySelector('[data-setting-key="streakHourOffset"]'),
  ).not.toHaveClass("hidden");
  expect(
    container.querySelector('[data-setting-key="accountName"]'),
  ).toHaveClass("hidden");
  expect(getSearchMatchCounts()).toEqual({ account: 1 });
});

it("searches authentication controls under account and deep links back to account", () => {
  vi.useFakeTimers();
  const { container } = render(() => (
    <SettingsSectionContext.Provider value="account">
      <AuthenticationTab />
    </SettingsSectionContext.Provider>
  ));
  setSettingsSearch("authentication");
  expect(getSearchMatchCounts()).toEqual({ account: 2 });
  expect(
    container.querySelector('[data-setting-key="authenticationGoogle"]'),
  ).not.toHaveClass("hidden");
  expect(
    container.querySelector('[data-setting-key="authenticationGitHub"]'),
  ).not.toHaveClass("hidden");
  expect(
    container.querySelector('[data-setting-key="revokeAllTokens"]'),
  ).toHaveClass("hidden");
  setSettingsSearch("");
  highlightSetting("authenticationGoogle");
  expect(getCurrentSettingsSection()).toBe("account");
  setCurrentSettingsSection("behavior");
  highlightSetting("revokeAllTokens");
  expect(getCurrentSettingsSection()).toBe("account");
});

it("keeps API tables inside their searchable row without remounting them", () => {
  const onClick = vi.fn();
  const { container, getByRole, getByLabelText } = render(() => (
    <Section
      key="apeKeys"
      title="API keys"
      fa={{ icon: "fa-key" }}
      description="Manage API access."
      button={{ text: "generate new key", onClick }}
      fullWidthInputs={<input aria-label="API key draft" />}
    />
  ));
  const input = getByLabelText<HTMLInputElement>("API key draft");
  fireEvent.input(input, { target: { value: "draft" } });
  setSettingsSearch("no matching setting");
  expect(input.closest("[data-setting-key]")).toHaveClass("hidden");
  setSettingsSearch("");
  expect(getByLabelText("API key draft")).toBe(input);
  expect(input.value).toBe("draft");
  expect(
    container.querySelector("[data-setting-key] [data-setting-key]"),
  ).toBeNull();
  fireEvent.click(getByRole("button", { name: "generate new key" }));
  expect(onClick).toHaveBeenCalledOnce();
});

it("selects account sections through individual setting deep links", () => {
  vi.useFakeTimers();
  render(() => (
    <SettingsSectionContext.Provider value="blockedUsers">
      <Section
        key="blockedUsers"
        title="blocked users"
        fa={{ icon: "fa-ban" }}
        description="Manage blocked users."
      />
    </SettingsSectionContext.Provider>
  ));
  highlightSetting("blockedUsers");
  expect(getCurrentSettingsSection()).toBe("blockedUsers");
});

it("preserves reactive restrictions on account actions", () => {
  const [disabled, setDisabled] = createSignal(false);
  const onClick = vi.fn();
  const { getByRole, queryByRole, getByText } = render(() => (
    <Section
      key="streakHourOffset"
      title="streak hour offset"
      fa={{ icon: "fa-clock" }}
      description="Change the reset hour."
      button={{ text: "update hour offset", onClick }}
      disabled={disabled()}
      disabledDescription="Already set."
    />
  ));
  fireEvent.click(getByRole("button", { name: "update hour offset" }));
  expect(onClick).toHaveBeenCalledOnce();
  setDisabled(true);
  expect(queryByRole("button", { name: "update hour offset" })).toBeNull();
  expect(getByText("Already set.")).toBeInTheDocument();
});
