import { describe, expect, mock, test } from "bun:test";

import { App } from "../src/app";
import { renderTui } from "./helpers/render";

describe("app shell", () => {
  test("starts on the test screen with navigation hints", async () => {
    const app = await renderTui(() => <App onQuit={() => undefined} />);
    const frame = await app.frame();
    expect(frame).toContain("typing test");
    expect(frame).toContain("[test] (ctrl+t)");
    expect(frame).toContain("settings (ctrl+s)");
    expect(frame).toContain("ctrl+c quit");
  });

  test("opens screens with global keys and goes back with escape", async () => {
    const app = await renderTui(() => <App onQuit={() => undefined} />);
    app.mockInput.pressKey("s", { ctrl: true });
    expect(await app.frame()).toContain("[settings] (ctrl+s)");

    app.mockInput.pressKey("l", { ctrl: true });
    expect(await app.frame()).toContain("[leaderboards] (ctrl+l)");

    await app.escape();
    expect(await app.frame()).toContain("[settings] (ctrl+s)");

    await app.escape();
    expect(await app.frame()).toContain("typing test");
  });

  test("escape at the root screen stays put", async () => {
    const app = await renderTui(() => <App onQuit={() => undefined} />);
    await app.escape();
    expect(await app.frame()).toContain("typing test");
  });

  test("screens handle their own keys before global bindings", async () => {
    const app = await renderTui(() => <App onQuit={() => undefined} />);
    app.mockInput.pressEnter();
    expect(await app.frame()).toContain("press enter to start the next test");

    // The result replaces itself with a new test instead of stacking.
    app.mockInput.pressEnter();
    expect(await app.frame()).toContain("typing test");
    await app.escape();
    expect(await app.frame()).toContain("typing test");
  });

  test("opening an earlier screen unwinds the stack", async () => {
    const app = await renderTui(() => <App onQuit={() => undefined} />);
    app.mockInput.pressKey("s", { ctrl: true });
    app.mockInput.pressKey("a", { ctrl: true });
    app.mockInput.pressKey("t", { ctrl: true });
    expect(await app.frame()).toContain("typing test");
    await app.escape();
    expect(await app.frame()).toContain("typing test");
  });

  test("ctrl+c quits from any screen", async () => {
    const onQuit = mock(() => undefined);
    const app = await renderTui(() => (
      <App initialScreen="account" onQuit={onQuit} />
    ));
    expect(await app.frame()).toContain("[account] (ctrl+a)");
    app.mockInput.pressCtrlC();
    expect(onQuit).toHaveBeenCalledTimes(1);
  });
});
