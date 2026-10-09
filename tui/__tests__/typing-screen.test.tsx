import { expect, test } from "bun:test";
import { join } from "node:path";

import { openConfigStore } from "../src/config/store";
import { createHistoryStore } from "../src/results/history";
import { renderApp } from "./helpers/app";
import { tempDir } from "./helpers/temp-dir";

test("completes words-10, displays core results, saves once and restarts", async () => {
  const config = await openConfigStore(join(await tempDir(), "config.json"));
  config.set("mode", "words");
  config.set("words", 10);
  let clock = 0;
  const words = "the quick brown fox jumps over the lazy dog again"
    .split(" ")
    .map((word, index) => word + (index === 9 ? "" : " "));
  const history = createHistoryStore();
  const app = await renderApp({
    config,
    history,
    testOptions: {
      words,
      now: () => clock,
      dateNow: () => 100000 + clock,
      schedule: false,
    },
  });
  for (const char of words.join("")) {
    clock += 180;
    app.mockInput.pressKey(char);
    await app.renderOnce();
  }
  await app.waitForFrame((frame) => frame.includes("enter next test"));
  expect(await app.frame()).toContain("100% acc");
  expect(await app.frame()).toContain("characters 49/0/0/0");
  expect(history.entries()).toHaveLength(1);
  config.set("resultSaving", false);
  config.set("resultSaving", true);
  await app.frame();
  expect(history.entries()).toHaveLength(1);
  app.mockInput.pressKey("o", { ctrl: true });
  expect(await app.frame()).toContain("local history · 1 tests");
  await app.escape();
  app.mockInput.pressEnter();
  await app.waitForFrame(
    (frame) =>
      frame.includes("typing test") && !frame.includes("loading words"),
  );
  expect(await app.frame()).toContain("0/10");
  expect(app.renderer.getCursorState().visible).toBe(true);
  await config.flush();
});

test("changes offline modes and respects the live stats configuration", async () => {
  const config = await openConfigStore(join(await tempDir(), "config.json"));
  config.set("liveSpeedStyle", "mini");
  config.set("words", 25);
  config.set("liveAccStyle", "mini");
  config.set("liveBurstStyle", "mini");
  const app = await renderApp({ config });
  expect(await app.frame()).toContain("0 wpm");
  expect(await app.frame()).toContain("100% acc");
  app.mockInput.pressKey("F2");
  await app.waitForFrame(
    (frame) => frame.includes("[words]") && !frame.includes("loading words"),
  );
  app.mockInput.pressKey("F5");
  await app.waitForFrame(
    (frame) => frame.includes("10 words") && !frame.includes("loading words"),
  );
  app.mockInput.pressKey("F3");
  app.mockInput.pressKey("F4");
  expect(config.config.punctuation).toBe(true);
  expect(config.config.numbers).toBe(true);
  app.resize(100, 24);
  expect(await app.frame()).toContain("typing test");
  await config.flush();
});
