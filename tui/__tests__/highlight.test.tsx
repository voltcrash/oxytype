import { getDefaultConfig } from "@oxytype/typing-core/config/default-config";
import { describe, expect, test } from "bun:test";
import { join } from "node:path";

import { openConfigStore } from "../src/config/store";
import { cellColor, typedEffectCell } from "../src/test/letter-colors";
import { toTerminalTheme } from "../src/theme/theme";
import { renderApp } from "./helpers/app";
import { tempDir } from "./helpers/temp-dir";

const colors = toTerminalTheme(getDefaultConfig()).colors;
const config = getDefaultConfig();
const words = { activeIndex: 2, hasError: (index: number) => index === 0 };

describe("highlight modes", () => {
  test("off shows correct letters as untyped", () => {
    expect(
      cellColor(
        { kind: "correct", wordIndex: 2 },
        colors,
        { ...config, highlightMode: "off" },
        words,
      ),
    ).toBe(colors.sub);
  });

  test("word modes colour whole words around the active one", () => {
    const next = { ...config, highlightMode: "next_word" as const };
    const color = (kind: "correct" | "untyped", wordIndex: number) =>
      cellColor({ kind, wordIndex }, colors, next, words);
    // Committed words without errors fade; errors stay visible.
    expect(color("correct", 1)).toBe(colors.sub);
    expect(color("correct", 0)).toBe(colors.error);
    expect(color("untyped", 2)).toBe(colors.text);
    expect(color("untyped", 3)).toBe(colors.text);
    expect(color("untyped", 4)).toBe(colors.sub);
    expect(
      cellColor(
        { kind: "correct", wordIndex: 0 },
        colors,
        { ...next, blindMode: true },
        words,
      ),
    ).toBe(colors.sub);
  });

  test("typed effects hide or dot typed letters", () => {
    const cell = { char: "a", width: 1, kind: "correct" as const };
    expect(typedEffectCell(cell, colors, config)).toBeUndefined();
    expect(
      typedEffectCell(cell, colors, { ...config, typedEffect: "hide" }),
    ).toEqual({ char: " " });
    expect(
      typedEffectCell({ ...cell, kind: "incorrect" }, colors, {
        ...config,
        typedEffect: "dots",
      }),
    ).toEqual({ char: "•", fg: colors.error });
  });

  test("renders dots for typed words", async () => {
    const store = await openConfigStore(join(await tempDir(), "config.json"));
    store.set("typedEffect", "dots");
    const app = await renderApp({
      config: store,
      testOptions: { words: ["cat ", "dog ", "eel"], schedule: false },
    });
    for (const char of "cat ") {
      app.mockInput.pressKey(char);
      await app.renderOnce();
    }
    await app.waitForFrame((frame) => frame.includes("••• dog eel"));
    await store.flush();
  });
});
