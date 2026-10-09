import { describe, expect, test } from "bun:test";
import { join } from "node:path";

import { openConfigStore } from "../src/config/store";
import { renderApp } from "./helpers/app";
import { tempDir } from "./helpers/temp-dir";

const words =
  "alpha bravo charlie delta echo foxtrot golf hotel india juliet kilo lima mike"
    .split(" ")
    .map((word) => `${word} `);

describe("test layout settings", () => {
  test("caps the line width", async () => {
    const config = await openConfigStore(join(await tempDir(), "config.json"));
    config.set("maxLineWidth", 20);
    const app = await renderApp({
      config,
      testOptions: { words, schedule: false },
    });
    const frame = await app.frame();
    expect(frame).toContain("alpha bravo charlie");
    expect(frame).not.toContain("alpha bravo charlie delta");
    await config.flush();
  });

  test("scrolls one line in tape mode", async () => {
    const config = await openConfigStore(join(await tempDir(), "config.json"));
    config.set("tapeMode", "word");
    config.set("tapeMargin", 10);
    const app = await renderApp({
      config,
      testOptions: { words, schedule: false },
    });
    // The first word starts 10% into the 77-column line.
    expect(await app.frame()).toContain(
      `\n ${" ".repeat(7)}alpha bravo charlie delta echo`,
    );
    for (const char of "alpha bravo ") {
      app.mockInput.pressKey(char);
      await app.renderOnce();
    }
    await app.waitForFrame((frame) =>
      // "charlie" starts at the margin; the typed words scroll off.
      frame.includes("\n  bravo charlie delta"),
    );
    // Only one line of words is shown.
    expect(await app.frame()).not.toContain("kilo lima mike\n");
    await config.flush();
  });
});
