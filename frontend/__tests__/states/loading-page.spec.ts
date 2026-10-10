import { afterEach, expect, it } from "vite-plus/test";

import {
  getBarAnimation,
  showBar,
  showError,
  showSpinner,
  updateBar,
} from "../../src/ts/states/loading-page";

afterEach(() => showSpinner());

it("releases a replaced progress request", async () => {
  const previous = updateBar(40, 1000);
  const next = updateBar(80, 1000);
  await previous;
  expect(getBarAnimation()?.percentage).toBe(80);
  getBarAnimation()?.onComplete();
  await next;
});

it.each([showSpinner, showError])(
  "releases pending progress when leaving bar mode (%s)",
  async (changeMode) => {
    await showBar();
    const pending = updateBar(90, 2000);
    changeMode();
    await pending;
    expect(getBarAnimation()).toBeUndefined();
  },
);

it("retains progress between consecutive bar stages", async () => {
  await showBar();
  const pending = updateBar(45, 1000);
  const request = getBarAnimation();
  await showBar();
  expect(getBarAnimation()).toBe(request);
  request?.onComplete();
  await pending;
});
