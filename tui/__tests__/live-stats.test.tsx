import { getDefaultConfig } from "@oxytype/typing-core/config/default-config";
import { describe, expect, test } from "bun:test";
import { join } from "node:path";

import { openConfigStore } from "../src/config/store";
import { liveStatsColor } from "../src/test/live-stats";
import { toTerminalTheme } from "../src/theme/theme";
import { renderApp } from "./helpers/app";
import { tempDir } from "./helpers/temp-dir";

const colors = toTerminalTheme(getDefaultConfig()).colors;

describe("live stats appearance", () => {
  test("uses the timer colour and opacity", () => {
    expect(
      liveStatsColor(colors, {
        timerColor: "main",
        timerOpacity: "1",
      }).toInts(),
    ).toEqual(colors.main.toInts());
    const [r, g, b] = liveStatsColor(colors, {
      timerColor: "black",
      timerOpacity: "0.5",
    }).toInts();
    const [br, bg, bb] = colors.bg.toInts();
    expect([r, g, b]).toEqual([
      Math.round(br / 2),
      Math.round(bg / 2),
      Math.round(bb / 2),
    ]);
  });

  test("shows word progress as a bar", async () => {
    const store = await openConfigStore(join(await tempDir(), "config.json"));
    store.set("words", 4);
    store.set("timerStyle", "bar");
    let clock = 0;
    const app = await renderApp({
      config: store,
      testOptions: {
        words: ["a ", "b ", "c ", "d"],
        now: () => clock,
        schedule: false,
      },
    });
    for (const char of "a b ") {
      clock += 100;
      app.mockInput.pressKey(char);
      await app.renderOnce();
    }
    // Two of four words fill half of the 78-column bar.
    await app.waitForFrame((frame) => frame.includes(`${"▀".repeat(39)} `));
    expect(await app.frame()).not.toContain("▀".repeat(40));
    await store.flush();
  });
});
