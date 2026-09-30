import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { afterEach, expect, it, vi } from "vitest";

import { PrivacyPolicy } from "../../../src/ts/components/standalone/PrivacyPolicy";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

it("sets the original opt-out cookie and adds the confirmation once", () => {
  vi.useFakeTimers();
  const now = new Date("2026-09-30T12:00:00Z");
  vi.setSystemTime(now);
  const cookie = vi.spyOn(document, "cookie", "set");
  const { container } = render(() => <PrivacyPolicy />);
  const link = container.querySelector(
    'a[href="#opt-out"]',
  ) as HTMLAnchorElement;
  fireEvent.click(link);
  fireEvent.click(link);
  const expires = new Date(now.getTime() + 1825 * 24 * 60 * 60 * 1000);
  expect(cookie).toHaveBeenLastCalledWith(
    `_pubcid_optout=1;expires=${expires.toUTCString()};path=/`,
  );
  expect(container.querySelectorAll("#cookieP h3")).toHaveLength(1);
  expect(container.querySelector("#cookieP h3")?.textContent).toBe(
    "Optout Success!",
  );
  expect(
    (container.querySelector("#cookieP h3") as HTMLElement).style.color,
  ).toBe("green");
});

it("retains the clipboard action and immediate confirmation", () => {
  const previous = Object.getOwnPropertyDescriptor(navigator, "clipboard");
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  const alert = vi.spyOn(window, "alert").mockImplementation(() => undefined);
  try {
    const { container } = render(() => <PrivacyPolicy />);
    fireEvent.click(
      container.querySelector('[aria-label="Click To Copy"]') as HTMLElement,
    );
    expect(writeText).toHaveBeenCalledWith("@miodec");
    expect(alert).toHaveBeenCalledWith("Copied To Clipboard!");
  } finally {
    if (previous === undefined) Reflect.deleteProperty(navigator, "clipboard");
    else Object.defineProperty(navigator, "clipboard", previous);
  }
});
