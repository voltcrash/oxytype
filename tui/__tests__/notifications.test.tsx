import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { createRoot } from "solid-js";

import { openConfigStore } from "../src/config/store";
import { createNotifications } from "../src/notifications";
import { renderApp } from "./helpers/app";
import { tempDir } from "./helpers/temp-dir";

describe("notifications", () => {
  test("expire, deduplicate and keep the newest few", async () => {
    await createRoot(async (dispose) => {
      const notifications = createNotifications({ durationMs: 20, limit: 2 });
      notifications.notify("one");
      notifications.notify("two");
      notifications.notify("one", "error");
      expect(notifications.entries().map((entry) => entry.message)).toEqual([
        "two",
        "one",
      ]);
      notifications.notify("three");
      expect(notifications.entries()).toHaveLength(2);
      await Bun.sleep(40);
      expect(notifications.entries()).toEqual([]);
      dispose();
    });
  });

  test("show rejected settings in the shell", async () => {
    const config = await openConfigStore(join(await tempDir(), "config.json"));
    const app = await renderApp({ config, initialScreen: "settings" });
    config.set("tapeMode", "word");
    config.set("showAllLines", true);
    expect(await app.frame()).toContain(
      "Show all lines doesn't support tape mode.",
    );
    await config.flush();
  });
});
