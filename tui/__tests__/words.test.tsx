import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { createSignal } from "solid-js";

import { ConfigContext, openConfigStore } from "../src/config/store";
import { layoutWords, lineWindow } from "../src/test/layout";
import { buildWordView } from "../src/test/word-view";
import { Words } from "../src/test/words";
import { createTheme, ThemeContext } from "../src/theme/theme";
import { renderTui } from "./helpers/render";
import { tempDir } from "./helpers/temp-dir";

describe("word rendering", () => {
  test("positions the native caret after wrapping and hides it when disabled", async () => {
    const store = await openConfigStore(join(await tempDir(), "config.json"));
    await store.flush();
    const theme = createTheme(store.config);
    const layout = layoutWords(
      ["one", "two", "three"].map((word) =>
        buildWordView(word, "", {
          ...store.config,
          zen: false,
          committed: false,
        }),
      ),
      7,
    );
    const [caret, setCaret] = createSignal({ line: 0, column: 2 });
    const app = await renderTui(() => (
      <ConfigContext.Provider value={store}>
        <ThemeContext.Provider value={theme}>
          <Words
            layout={layout}
            window={{ start: 0, end: 2 }}
            caret={caret()}
          />
        </ThemeContext.Provider>
      </ConfigContext.Provider>
    ));
    await app.frame();
    expect(app.renderer.getCursorState()).toMatchObject({
      x: 3,
      y: 1,
      visible: true,
    });
    setCaret({ line: 1, column: 3 });
    await app.frame();
    expect(app.renderer.getCursorState()).toMatchObject({
      x: 4,
      y: 3,
      visible: true,
    });
    store.set("caretStyle", "off");
    await app.frame();
    expect(app.renderer.getCursorState().visible).toBe(false);
    await store.flush();
  });
  test("renders correct, incorrect, extra and untyped letters in theme colours", async () => {
    const store = await openConfigStore(join(await tempDir(), "config.json"));
    await store.flush();
    const theme = createTheme(store.config);
    const layout = layoutWords(
      [
        buildWordView("cat", "coxz", {
          ...store.config,
          zen: false,
          committed: false,
        }),
        buildWordView("dog", "", {
          ...store.config,
          zen: false,
          committed: false,
        }),
      ],
      40,
    );
    const app = await renderTui(() => (
      <ConfigContext.Provider value={store}>
        <ThemeContext.Provider value={theme}>
          <Words
            layout={layout}
            window={lineWindow(layout.lines.length, 0, false)}
          />
        </ThemeContext.Provider>
      </ConfigContext.Provider>
    ));
    expect(await app.frame()).toContain("catz dog");
    const spans = app.captureSpans().lines[0]?.spans ?? [];
    for (const [letter, color] of [
      ["c", theme().colors.text],
      ["at", theme().colors.error],
      ["z", theme().colors.errorExtra],
      [" dog", theme().colors.sub],
    ] as const) {
      expect(
        spans.some(
          (span) => span.text.includes(letter) && span.fg.equals(color),
        ),
      ).toBe(true);
    }
  });
});
