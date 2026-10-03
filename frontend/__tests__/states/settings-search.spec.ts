import { createRoot } from "solid-js";
import { afterEach, describe, expect, it } from "vite-plus/test";

import {
  getSearchMatchCounts,
  registerSearchable,
  setSettingsSearch,
} from "../../src/ts/states/settings-search";

let dispose: (() => void) | undefined;

afterEach(() => {
  dispose?.();
  setSettingsSearch("");
});

function register(): void {
  createRoot((d) => {
    dispose = d;
    registerSearchable(() => "smooth caret", "caret");
    registerSearchable(() => "caret style", "caret");
    registerSearchable(() => "tape margin caret", "appearance");
    registerSearchable(() => "sound volume", "sound");
    registerSearchable(() => "caret without section");
  });
}

describe("getSearchMatchCounts", () => {
  it("is empty without a search", () => {
    register();
    expect(getSearchMatchCounts()).toEqual({});
  });

  it("counts matching settings per section", () => {
    register();
    setSettingsSearch("caret");
    expect(getSearchMatchCounts()).toEqual({ caret: 2, appearance: 1 });
  });

  it("drops settings once unregistered", () => {
    register();
    dispose?.();
    dispose = undefined;
    setSettingsSearch("caret");
    expect(getSearchMatchCounts()).toEqual({});
  });
});
