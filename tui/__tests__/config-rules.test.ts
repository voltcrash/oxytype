import type { PartialConfig } from "@oxytype/schemas/configs";
import { describe, expect, test } from "bun:test";
import { join } from "node:path";

import { openConfigStore } from "../src/config/store";
import { tempDir } from "./helpers/temp-dir";

async function store(): ReturnType<typeof openConfigStore> {
  const config = await openConfigStore(join(await tempDir(), "config.json"));
  await config.flush();
  return config;
}

describe("shared setting rules", () => {
  test("applies dependent settings and emits one patch", async () => {
    const config = await store();
    const patches: PartialConfig[] = [];
    config.subscribe((patch) => patches.push(patch));
    expect(config.set("stopOnError", "letter")).toBe(true);
    expect(config.set("confidenceMode", "max")).toBe(true);
    expect(config.config.stopOnError).toBe("off");
    expect(patches.at(-1)).toEqual({
      stopOnError: "off",
      confidenceMode: "max",
    });
    expect(config.set("quoteLength", [2])).toBe(true);
    expect(config.config.mode).toBe("quote");
    expect(config.set("punctuation", true)).toBe(true);
    expect(config.config.punctuation).toBe(false);
    await config.flush();
  });

  test("reports blocked changes without applying them", async () => {
    const config = await store();
    const reasons: string[] = [];
    config.onReject((failure) => reasons.push(failure.message));
    config.set("tapeMode", "word");
    expect(config.set("showAllLines", true)).toBe(false);
    expect(config.config.showAllLines).toBe(false);
    expect(reasons).toEqual(["Show all lines doesn't support tape mode."]);
    await config.flush();
  });

  test("blocks restarting settings during no quit tests", async () => {
    const config = await store();
    let active = false;
    config.setTestActive(() => active);
    expect(config.set("funbox", ["no_quit"])).toBe(true);
    expect(config.set("numbers", true)).toBe(true);
    active = true;
    expect(config.set("numbers", false)).toBe(false);
    expect(config.set("caretStyle", "block")).toBe(true);
    await config.flush();
  });

  test("applies imported configs in the web's order", async () => {
    const config = await store();
    const patches: PartialConfig[] = [];
    config.subscribe((patch) => patches.push(patch));
    config.apply({ mode: "time", time: 60, words: 50, quoteLength: [1] });
    expect(config.config.mode).toBe("time");
    expect(config.config.time).toBe(60);
    expect(config.config.words).toBe(50);
    expect(patches.at(-1)?.time).toBe(60);
    await config.flush();
  });
});
