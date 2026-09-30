import type { Ads } from "@monkeytype/schemas/configs";

import { cleanup, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, expect, it, vi } from "vitest";
const [ads, setAds] = createSignal<Ads>("sellout");
vi.mock("../../../src/ts/config/store", () => ({
  Config: { ads: "sellout" },
  getConfig: {
    get ads() {
      return ads();
    },
  },
}));
vi.mock("../../../src/ts/states/test", () => ({ getFocus: () => false }));
vi.mock("../../../src/ts/states/core", () => ({
  getIsScreenshotting: () => false,
}));
import { Advertisement } from "../../../src/ts/components/common/Advertisement";
import {
  getAdSlot,
  removeAdSlots,
  setAdMessage,
  setShellAdsVisible,
} from "../../../src/ts/states/ads";
afterEach(() => {
  cleanup();
  setAds("sellout");
  setShellAdsVisible(true);
});

it("keeps static slot removals one-way and unregisters SDK refs on disposal", () => {
  const { container } = render(() => (
    <Advertisement id="ad-footer" visible="sellout" staticVisibility focus />
  ));
  expect(getAdSlot("ad-footer-wrapper")).toBe(
    container.querySelector("#ad-footer-wrapper"),
  );
  setShellAdsVisible(false);
  expect(container.querySelector("#ad-footer-wrapper")).toHaveClass(
    "testPage",
    "hidden!",
  );
  removeAdSlots.dispatch(["ad-footer"]);
  expect(container.querySelector("#ad-footer-wrapper")).toBeNull();
  expect(getAdSlot("ad-footer-wrapper")).toBeUndefined();
  setAds("off");
  setAds("sellout");
  expect(container.querySelector("#ad-footer-wrapper")).toBeNull();
});

it("renders blocker messages as JSX while dynamic slots follow the config", () => {
  const { container } = render(() => (
    <Advertisement id="ad-result" visible="sellout" withText />
  ));
  setAdMessage("adblock");
  expect(container).toHaveTextContent("Using an ad blocker? No worries");
  expect(container.querySelector(".smalltext i")).toHaveTextContent(
    "disable all ads",
  );
  setAdMessage("cookies");
  expect(container).toHaveTextContent("Ads not working? Ooops");
  setAds("off");
  expect(getAdSlot("ad-result-wrapper")).toBeUndefined();
  setAds("sellout");
  expect(getAdSlot("ad-result-wrapper")).toBeDefined();
});
