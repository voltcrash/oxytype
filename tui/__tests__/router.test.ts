import { describe, expect, test } from "bun:test";
import { createRoot } from "solid-js";
import { createRouter } from "../src/router/router";
import {
  currentScreen,
  popScreen,
  pushScreen,
  replaceScreen,
} from "../src/router/stack";

describe("screen stack", () => {
  test("pushes new screens", () => {
    expect(pushScreen(["test"], "settings")).toEqual(["test", "settings"]);
  });

  test("unwinds to a screen that is already open", () => {
    const stack = pushScreen(["test", "settings", "account"], "settings");
    expect(stack).toEqual(["test", "settings"]);
    expect(pushScreen(stack, "test")).toEqual(["test"]);
    expect(pushScreen(["test"], "test")).toEqual(["test"]);
  });

  test("replaces the top screen", () => {
    expect(replaceScreen(["test", "result"], "settings")).toEqual([
      "test",
      "settings",
    ]);
    expect(replaceScreen(["test", "result"], "test")).toEqual(["test"]);
    expect(replaceScreen(["result"], "test")).toEqual(["test"]);
  });

  test("pops until the root", () => {
    expect(popScreen(["test", "settings"])).toEqual(["test"]);
    expect(popScreen(["test"])).toBeUndefined();
    expect(currentScreen(["test", "account"])).toBe("account");
  });
});

describe("router", () => {
  test("tracks the current screen reactively", () => {
    createRoot((dispose) => {
      const router = createRouter("test");
      router.push("settings");
      expect(router.current()).toBe("settings");
      expect(router.back()).toBe(true);
      expect(router.back()).toBe(false);
      expect(router.current()).toBe("test");
      router.push("account");
      router.reset("leaderboards");
      expect(router.stack()).toEqual(["leaderboards"]);
      dispose();
    });
  });
});
