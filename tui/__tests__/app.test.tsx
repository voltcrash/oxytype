import { describe, expect, mock, test } from "bun:test";
import { join } from "node:path";

import { openConfigStore } from "../src/config/store";
import { renderApp } from "./helpers/app";
import { tempDir } from "./helpers/temp-dir";

describe("app shell", () => {
  test("starts on the test screen with single-line navigation hints", async () => {
    const app = await renderApp();
    const frame = await app.frame();
    expect(frame).toContain("typing test");
    // Header and hints fit an 80-column terminal without wrapping.
    expect(frame).toContain("oxytype  [test]  settings  account  leaderboards");
    expect(frame).toContain(
      "esc back  ^t test  ^s settings  ^a account  ^l leaderboards  ^c quit",
    );
  });

  test("opens screens with global keys and goes back with escape", async () => {
    const app = await renderApp();
    app.mockInput.pressKey("s", { ctrl: true });
    expect(await app.frame()).toContain("[settings]");

    app.mockInput.pressKey("l", { ctrl: true });
    expect(await app.frame()).toContain("[leaderboards]");

    await app.escape();
    expect(await app.frame()).toContain("[settings]");

    await app.escape();
    expect(await app.frame()).toContain("typing test");
  });

  test("escape at the root screen stays put", async () => {
    const app = await renderApp();
    await app.escape();
    expect(await app.frame()).toContain("typing test");
  });

  test("screens handle their own keys before global bindings", async () => {
    const app = await renderApp();
    app.mockInput.pressEnter();
    expect(await app.frame()).toContain("press enter to start the next test");

    // The result replaces itself with a new test instead of stacking.
    app.mockInput.pressEnter();
    expect(await app.frame()).toContain("typing test");
    await app.escape();
    expect(await app.frame()).toContain("typing test");
  });

  test("opening an earlier screen unwinds the stack", async () => {
    const app = await renderApp();
    app.mockInput.pressKey("s", { ctrl: true });
    app.mockInput.pressKey("a", { ctrl: true });
    app.mockInput.pressKey("t", { ctrl: true });
    expect(await app.frame()).toContain("typing test");
    await app.escape();
    expect(await app.frame()).toContain("typing test");
  });

  test("ctrl+c quits from any screen", async () => {
    const onQuit = mock(() => undefined);
    const app = await renderApp({ initialScreen: "account", onQuit });
    expect(await app.frame()).toContain("[account]");
    app.mockInput.pressCtrlC();
    expect(onQuit).toHaveBeenCalledTimes(1);
  });

  test("reflects config changes on the test screen", async () => {
    const config = await openConfigStore(join(await tempDir(), "config.json"));
    const app = await renderApp({ config });
    expect(await app.frame()).toContain("30s · english");

    config.set("mode", "words");
    config.set("words", 25);
    expect(await app.frame()).toContain("25 words · english");
    await config.flush();
  });
});
