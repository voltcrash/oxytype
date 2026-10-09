import { describe, expect, test } from "bun:test";
import { join } from "node:path";

import { openConfigStore, type ConfigStore } from "../src/config/store";
import { renderApp } from "./helpers/app";
import { tempDir } from "./helpers/temp-dir";

async function setup(): Promise<{
  app: Awaited<ReturnType<typeof renderApp>>;
  config: ConfigStore;
}> {
  const config = await openConfigStore(join(await tempDir(), "config.json"));
  const app = await renderApp({ config });
  return { app, config };
}

async function choose(
  app: Awaited<ReturnType<typeof renderApp>>,
  text: string,
): Promise<void> {
  await app.mockInput.typeText(text);
  app.mockInput.pressEnter();
  await app.renderOnce();
}

describe("command palette", () => {
  test("changes mode, theme and language", async () => {
    const { app, config } = await setup();
    // The web default lists every command once something is typed.
    app.mockInput.pressKey("p", { ctrl: true });
    expect(await app.frame()).toContain("start typing to search");
    await app.mockInput.typeText("mode words");
    expect(await app.frame()).toContain("Mode › words");
    app.mockInput.pressEnter();
    await app.renderOnce();
    expect(config.config.mode).toBe("words");
    expect(await app.frame()).not.toContain("type to search");

    app.mockInput.pressKey("k", { ctrl: true });
    await choose(app, "theme nord light");
    expect(config.config.theme).toBe("nord_light");

    app.mockInput.pressKey("p", { ctrl: true });
    await choose(app, "language french 1k");
    expect(config.config.language).toBe("french_1k");
    await config.flush();
  });

  test("navigates nested lists and accepts custom values", async () => {
    const { app, config } = await setup();
    config.set("singleListCommandLine", "manual");
    config.set("mode", "words");
    app.mockInput.pressKey("p", { ctrl: true });
    await choose(app, "time");
    // The current value is marked.
    expect(await app.frame()).toContain("● 30");
    await choose(app, "custom");
    expect(await app.frame()).toContain("› 30");
    app.mockInput.pressKey("u", { ctrl: true });
    await choose(app, "-4");
    expect(await app.frame()).toContain("Invalid value");
    app.mockInput.pressKey("u", { ctrl: true });
    await choose(app, "45");
    expect(config.config.time).toBe(45);
    expect(config.config.mode).toBe("time");
    await config.flush();
  });

  test("goes back through lists, then closes", async () => {
    const { app, config } = await setup();
    config.set("singleListCommandLine", "manual");
    app.mockInput.pressKey("p", { ctrl: true });
    await choose(app, "difficulty");
    expect(await app.frame()).toContain("Difficulty...");
    await app.escape();
    expect(await app.frame()).toContain("type to search");
    await app.escape();
    expect(await app.frame()).not.toContain("type to search");
    // Escape no longer belongs to the palette.
    expect(await app.frame()).toContain("typing test");
    await config.flush();
  });

  test("searches every command in single list mode", async () => {
    const { app, config } = await setup();
    config.set("singleListCommandLine", "manual");
    app.mockInput.pressKey("p", { ctrl: true });
    // In manual mode, ">" searches every command.
    await app.mockInput.typeText(">blind on");
    expect(await app.frame()).toContain("Blind mode › on");
    app.mockInput.pressEnter();
    await app.renderOnce();
    expect(config.config.blindMode).toBe(true);
    await config.flush();
  });

  test("imports settings JSON", async () => {
    const { app, config } = await setup();
    app.mockInput.pressKey("p", { ctrl: true });
    await choose(app, "import settings json");
    await choose(app, '{"punctuation":true,"time":60}');
    expect(config.config.punctuation).toBe(true);
    expect(config.config.time).toBe(60);
    expect(await app.frame()).toContain("Done");
    await config.flush();
  });
});
