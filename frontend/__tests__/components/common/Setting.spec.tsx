import { cleanup, render } from "@solidjs/testing-library";
import { afterEach, expect, it, vi } from "vitest";

import { Setting } from "../../../src/ts/components/common/Setting";
import {
  highlightSetting,
  setHighlightedSetting,
} from "../../../src/ts/states/settings-highlight";
afterEach(() => {
  cleanup();
  setHighlightedSetting(null);
  vi.useRealTimers();
  vi.restoreAllMocks();
});
it("scrolls and highlights after 250ms, clears the previous setting, and cancels on disposal", () => {
  vi.useFakeTimers();
  const scroll = vi.fn();
  const { container, unmount } = render(() => (
    <Setting
      key="test"
      title="test"
      description="test"
      fa={{ icon: "fa-cog" }}
    />
  ));
  const element = container.querySelector('[data-setting-key="test"]');
  Object.defineProperty(element, "scrollIntoView", { value: scroll });
  highlightSetting("test");
  vi.advanceTimersByTime(249);
  expect(element).not.toHaveClass("settings-highlight");
  vi.advanceTimersByTime(1);
  expect(element).toHaveClass("settings-highlight");
  expect(scroll).toHaveBeenCalledWith({ block: "center", behavior: "auto" });
  highlightSetting(null);
  expect(element).not.toHaveClass("settings-highlight");
  highlightSetting("test");
  unmount();
  vi.advanceTimersByTime(250);
  expect(scroll).toHaveBeenCalledOnce();
});
