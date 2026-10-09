import { describe, expect, test } from "bun:test";
import { join } from "node:path";

import { ConfigContext, openConfigStore } from "../src/config/store";
import { layoutWords, lineWindow } from "../src/test/layout";
import { buildWordView } from "../src/test/word-view";
import { Words } from "../src/test/words";
import { createTheme, ThemeContext } from "../src/theme/theme";
import { renderTui } from "./helpers/render";
import { tempDir } from "./helpers/temp-dir";

describe("word rendering", () => {
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
