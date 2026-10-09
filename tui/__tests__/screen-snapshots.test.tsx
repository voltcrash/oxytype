import { describe, expect, test } from "bun:test";
import { join } from "node:path";

import type { ScreenId } from "../src/router/screens";

import { App } from "../src/app";
import { openConfigStore } from "../src/config/store";
import { createTextLibrary } from "../src/storage/texts";
import { renderTui } from "./helpers/render";
import { tempDir } from "./helpers/temp-dir";

async function screen(
  initialScreen: ScreenId = "test",
  size = { width: 80, height: 24 },
) {
  const config = await openConfigStore(join(await tempDir(), "config.json"));
  config.set("mode", "words");
  config.set("words", 2);
  await config.flush();
  let now = 0;
  const app = await renderTui(
    () => (
      <App
        config={config}
        initialScreen={initialScreen}
        onQuit={() => undefined}
        testOptions={{
          words: ["cat ", "dog"],
          now: () => now,
          schedule: false,
          texts: createTextLibrary(),
        }}
      />
    ),
    size,
  );
  await app.waitForFrame((frame) => !frame.includes("loading words"));
  return {
    ...app,
    snapshot: async () =>
      (await app.frame())
        .split("\n")
        .map((line) => line.trimEnd())
        .join("\n"),
    finish: async () => {
      for (const char of "cat dog") {
        now += 500;
        app.mockInput.pressKey(char);
        await app.renderOnce();
      }
      await app.waitForFrame((frame) => frame.includes("100% acc"));
    },
  };
}

describe("OpenTUI screen snapshots", () => {
  test("ready, typing and result at 80x24", async () => {
    const app = await screen();
    expect(await app.snapshot()).toMatchSnapshot("ready");
    await app.finish();
    expect(await app.snapshot()).toMatchSnapshot("result with chart");
    app.mockInput.pressKey("r");
    expect(await app.snapshot()).toMatchSnapshot("replay");
    app.mockInput.pressKey("o", { ctrl: true });
    app.mockInput.pressEnter();
    expect(await app.snapshot()).toMatchSnapshot("history details");
  });

  test("compact ready and result at 40x16", async () => {
    const app = await screen("test", { width: 40, height: 16 });
    expect(await app.snapshot()).toMatchSnapshot("compact ready");
    await app.finish();
    expect(await app.snapshot()).toMatchSnapshot("compact result");
  });

  test("settings and palette search", async () => {
    const app = await screen("settings");
    expect(await app.snapshot()).toMatchSnapshot("behavior settings");
    app.mockInput.pressKey("p", { ctrl: true });
    await app.mockInput.typeText("theme");
    expect(await app.snapshot()).toMatchSnapshot("theme palette");
  });

  test.each([
    "custom",
    "funboxes",
    "challenges",
    "account",
    "leaderboards",
  ] as const)("%s screen", async (id) => {
    const app = await screen(id);
    expect(await app.snapshot()).toMatchSnapshot(id);
  });
});
