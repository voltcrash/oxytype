import { cleanup, render } from "@solidjs/testing-library";
import { afterEach, expect, it } from "vitest";

import { ThirdPartyEffects } from "../../../src/ts/components/core/ThirdPartyEffects";
import {
  setAnalyticsMarkupEnabled,
  setEgMarkupEnabled,
  setRampScriptUrl,
} from "../../../src/ts/states/third-party";

afterEach(() => {
  cleanup();
  setAnalyticsMarkupEnabled(false);
  setEgMarkupEnabled(false);
  setRampScriptUrl(undefined);
});

it("owns the SDK head script and removes it on disposal", () => {
  const { unmount } = render(() => <ThirdPartyEffects />);
  setRampScriptUrl("https://example.test/ramp.js");
  const script = document.head.querySelector<HTMLScriptElement>(
    'script[src="https://example.test/ramp.js"]',
  );
  expect(script?.getAttribute("async")).toBe("true");
  expect(script?.isConnected).toBe(true);
  unmount();
  expect(script?.isConnected).toBe(false);
});

it("keeps the parsed analytics markup and EG fallback under component ownership", () => {
  const { container, unmount } = render(() => <ThirdPartyEffects />);
  setAnalyticsMarkupEnabled(true);
  setEgMarkupEnabled(true);
  expect(container.querySelectorAll("script")).toHaveLength(2);
  expect(container.querySelector("noscript")?.outerHTML).toContain(
    "GTM-W7WN5QV",
  );
  const eg = document.head.lastElementChild;
  expect(eg?.textContent).toContain("eg-aps-bootstrap");
  unmount();
  expect(eg?.isConnected).toBe(false);
  expect(container.querySelector("script")).toBeNull();
});
