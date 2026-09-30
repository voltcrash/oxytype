import { cleanup, render } from "@solidjs/testing-library";
import { afterEach, expect, it, vi } from "vitest";

import { SkillIssue } from "../../../src/ts/components/core/SkillIssue";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it("shows the original delayed message and cancels the timer on disposal", () => {
  vi.useFakeTimers();
  const { container, unmount } = render(() => <SkillIssue />);
  expect(container.querySelector("iframe")?.getAttribute("src")).toContain(
    "autoplay=1&mute=0",
  );
  expect(container.querySelector("p")).toBeNull();
  vi.advanceTimersByTime(4999);
  expect(container.querySelector("p")).toBeNull();
  vi.advanceTimersByTime(1);
  expect(container.querySelector("p")?.textContent).toContain(
    "please wait a bit longer",
  );
  unmount();
  render(() => <SkillIssue />).unmount();
  expect(vi.getTimerCount()).toBe(0);
});
