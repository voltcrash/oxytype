import { cleanup, render } from "@solidjs/testing-library";
import { afterEach, expect, it } from "vite-plus/test";

import { Advertisement } from "../../../src/ts/components/common/Advertisement";
import {
  getAdSlot,
  setAdMessage,
  setShellAdsVisible,
} from "../../../src/ts/states/ads";

afterEach(cleanup);

it("keeps Oxytype free of upstream ad slots and blocker messages", () => {
  const { container } = render(() => (
    <Advertisement id="ad-result" visible="sellout" withText />
  ));
  setShellAdsVisible(true);
  setAdMessage("adblock");
  expect(container.querySelector(".advertisement")).toBeNull();
  expect(container).toBeEmptyDOMElement();
  expect(getAdSlot("ad-result-wrapper")).toBeUndefined();
  setAdMessage("cookies");
  expect(container).toBeEmptyDOMElement();
});
