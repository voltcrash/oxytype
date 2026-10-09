import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { getDefaultConfig } from "@oxytype/typing-core/config/default-config";
import { describe, expect, test } from "bun:test";
import { openConfigStore } from "../src/config/store";
import { tempDir } from "./helpers/temp-dir";

async function configFile(): Promise<string> {
  return join(await tempDir(), "config", "config.json");
}

async function writeStored(file: string, text: string): Promise<void> {
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, text);
}

async function readStored(file: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(file, "utf8")) as Record<string, unknown>;
}

describe("config store", () => {
  test("creates defaults on first run", async () => {
    const file = await configFile();
    const store = await openConfigStore(file);
    await store.flush();
    expect(store.status).toBe("created");
    expect({ ...store.config }).toEqual(getDefaultConfig());
    expect(await readStored(file)).toEqual(getDefaultConfig());
  });

  test("survives a restart", async () => {
    const file = await configFile();
    const first = await openConfigStore(file);
    expect(first.set("mode", "words")).toBe(true);
    expect(first.set("words", 25)).toBe(true);
    expect(first.set("funbox", ["mirror"])).toBe(true);
    const colors = getDefaultConfig().customThemeColors.toReversed();
    expect(first.set("customThemeColors", colors as never)).toBe(true);
    await first.flush();

    const second = await openConfigStore(file);
    expect(second.status).toBe("ok");
    expect(second.config.mode).toBe("words");
    expect(second.config.words).toBe(25);
    expect([...second.config.funbox]).toEqual(["mirror"]);
    expect(second.config.customThemeColors[0]).toBe("#7e2a33");
  });

  test("rejects invalid values without persisting them", async () => {
    const file = await configFile();
    const store = await openConfigStore(file);
    expect(store.set("time", -5)).toBe(false);
    expect(store.set("mode", "marathon" as never)).toBe(false);
    // Removed web features are not settable from the terminal.
    expect(store.set("caretStyle", "banana")).toBe(false);
    expect(store.set("monkey", true)).toBe(false);
    await store.flush();
    expect(store.config.time).toBe(30);
    expect((await readStored(file))["time"]).toBe(30);
  });

  test("migrates legacy values and repairs invalid ones", async () => {
    const file = await configFile();
    await writeStored(
      file,
      JSON.stringify({ quickTab: true, time: "fast", theme: "nord" }),
    );

    const store = await openConfigStore(file);
    await store.flush();
    expect(store.status).toBe("repaired");
    expect(store.config.quickRestart).toBe("tab");
    expect(store.config.time).toBe(30);
    expect(store.config.theme).toBe("nord");
    expect(await readStored(file)).not.toHaveProperty("quickTab");
  });

  test("replaces unreadable files with defaults", async () => {
    const file = await configFile();
    await writeStored(file, "{ not json");

    const store = await openConfigStore(file);
    await store.flush();
    expect(store.status).toBe("reset");
    expect(await readStored(file)).toEqual(getDefaultConfig());
  });

  test("resets to defaults and keeps the last write", async () => {
    const file = await configFile();
    const store = await openConfigStore(file);
    store.set("time", 60);
    store.set("time", 120);
    store.reset();
    store.set("language", "english_1k");
    await store.flush();
    expect(await readStored(file)).toEqual({
      ...getDefaultConfig(),
      language: "english_1k",
    });
  });
});
