import { cleanup, render } from "@solidjs/testing-library";
import { afterEach, expect, it } from "vite-plus/test";

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

it("does not load inherited tracking or advertising integrations", () => {
  const head = document.head.innerHTML;
  const { container } = render(() => <ThirdPartyEffects />);
  setRampScriptUrl("https://example.test/ramp.js");
  setAnalyticsMarkupEnabled(true);
  setEgMarkupEnabled(true);
  expect(document.head.innerHTML).toBe(head);
  expect(container.querySelector("script, iframe, noscript")).toBeNull();
});
