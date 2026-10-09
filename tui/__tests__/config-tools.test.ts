import { describe, expect, test } from "bun:test";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { openConfigStore } from "../src/config/store";
import { configTools } from "../src/config/tools";
import { createNotifications } from "../src/notifications";
import { tempDir } from "./helpers/temp-dir";

describe("config tools", () => {
  test("imports files through shared rules and exports without replacing files", async () => {
    const dir = await tempDir();
    const store = await openConfigStore(join(dir, "config.json"));
    const notifications = createNotifications();
    const tools = configTools({ store, notifications, copy: () => false });
    const input = join(dir, "input.json");
    await writeFile(input, JSON.stringify({ time: 60, punctuation: true }));
    await tools
      .find((it) => it.id === "importSettingsFile")
      ?.input?.submit(input);
    expect(store.config.time).toBe(60);
    const output = join(dir, "export.json");
    const save = tools.find((it) => it.id === "exportSettingsFile")?.input;
    await save?.submit(output);
    expect(JSON.parse(await readFile(output, "utf8")).time).toBe(60);
    expect(save?.submit(output)).rejects.toThrow();
    await writeFile(input, "[]");
    expect(
      tools.find((it) => it.id === "importSettingsFile")?.input?.submit(input),
    ).rejects.toThrow("must be an object");
    expect(store.config.time).toBe(60);
    const reset = tools.find((it) => it.id === "resetSettings")?.subgroup?.();
    await reset?.list.find((it) => it.id === "confirmResetSettings")?.exec?.();
    expect(store.config.time).toBe(30);
    notifications.dispose();
  });
});
