import { expect, it } from "vitest";
import {
  isAnyPopupVisible,
  registerOverlayVisibility,
} from "../../../src/ts/states/overlay-visibility";

it("keeps a closing overlay visible until its component reports no visible rects", () => {
  let visible = true;
  const unregister = registerOverlayVisibility(() => visible);
  expect(isAnyPopupVisible()).toBe(true);
  visible = false;
  expect(isAnyPopupVisible()).toBe(false);
  visible = true;
  unregister();
  expect(isAnyPopupVisible()).toBe(false);
});
