import { describe, expect, test } from "bun:test";
import { join } from "node:path";

import { openConfigStore, type ConfigStore } from "../src/config/store";
import { renderApp } from "./helpers/app";
import { tempDir } from "./helpers/temp-dir";

type App = Awaited<ReturnType<typeof renderApp>>;

async function setup(): Promise<{ app: App; config: ConfigStore }> {
  const config = await openConfigStore(join(await tempDir(), "config.json"));
  const app = await renderApp({ config, initialScreen: "settings" });
  return { app, config };
}

async function search(app: App, text: string): Promise<void> {
  app.mockInput.pressKey("/");
  await app.mockInput.typeText(text);
  app.mockInput.pressEnter();
  await app.renderOnce();
}

describe("settings screen", () => {
  test("changes inline options and resets them", async () => {
    const { app, config } = await setup();
    const frame = await app.frame();
    expect(frame).toContain("[behavior]");
    expect(frame).toContain("difficulty");
    expect(frame).toContain("[normal]");
    // The description of the selected setting comes from shared metadata.
    expect(frame).toContain("Normal is the classic typing test experience.");
    app.mockInput.pressArrow("right");
    expect(config.config.difficulty).toBe("expert");
    app.mockInput.pressArrow("left");
    app.mockInput.pressArrow("left");
    expect(config.config.difficulty).toBe("master");
    expect(await app.frame()).toContain("• difficulty");
    app.mockInput.pressKey("r");
    expect(config.config.difficulty).toBe("normal");
    await config.flush();
  });

  test("searches every section", async () => {
    const { app, config } = await setup();
    await search(app, "british");
    const frame = await app.frame();
    expect(frame).toContain("british english");
    expect(frame).not.toContain("difficulty");
    app.mockInput.pressEnter();
    expect(config.config.britishEnglish).toBe(true);
    await app.escape();
    expect(await app.frame()).toContain("difficulty");
    await search(app, "zzzz");
    expect(await app.frame()).toContain('No settings match "zzzz".');
    await config.flush();
  });

  test("edits custom values and long option lists in the palette", async () => {
    const { app, config } = await setup();
    await search(app, "min speed");
    app.mockInput.pressEnter();
    expect(await app.frame()).toContain("› 100");
    app.mockInput.pressKey("u", { ctrl: true });
    await app.mockInput.typeText("70");
    app.mockInput.pressEnter();
    await app.renderOnce();
    expect(config.config.minWpm).toBe("custom");
    expect(config.config.minWpmCustomSpeed).toBe(70);
    expect(await app.frame()).toContain("[custom]");
    expect(await app.frame()).toContain("70 wpm");

    await app.escape();
    await search(app, "language");
    app.mockInput.pressEnter();
    await app.mockInput.typeText("german 1k");
    app.mockInput.pressEnter();
    await app.renderOnce();
    expect(config.config.language).toBe("german_1k");
    expect(await app.frame()).toContain("german 1k");
    await config.flush();
  });

  test("marks web-only settings", async () => {
    const { app, config } = await setup();
    await search(app, "palette shortcut");
    expect(await app.frame()).toContain("Mod+K · terminal ^p  web only");
    await config.flush();
  });
});
