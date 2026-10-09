import { themes, ThemesList } from "@oxytype/typing-core/themes";
import { describe, expect, test } from "bun:test";
import { join } from "node:path";

import { openConfigStore } from "../src/config/store";
import { parseHex } from "../src/theme/color";
import { renderApp } from "./helpers/app";
import { tempDir } from "./helpers/temp-dir";

async function backgroundAt(
  app: Awaited<ReturnType<typeof renderApp>>,
): Promise<number[]> {
  await app.renderOnce();
  const span = app.captureSpans().lines[0]?.spans[0];
  return span?.bg.toInts().slice(0, 3) ?? [];
}

function rgb(hex: string): number[] {
  const { r, g, b } = parseHex(hex);
  return [r, g, b];
}

describe("theme switching", () => {
  test("renders the configured theme", async () => {
    const app = await renderApp();
    expect(await backgroundAt(app)).toEqual(rgb(themes.serika_dark.bg));
    expect(await app.frame()).toContain("serika dark");
  });

  test("switches and persists themes at runtime", async () => {
    const file = join(await tempDir(), "config.json");
    const config = await openConfigStore(file);
    const app = await renderApp({ config, initialScreen: "settings" });
    const names = ThemesList.map((it) => it.name);
    const next = names[names.indexOf("serika_dark") + 1] ?? "";

    app.mockInput.pressArrow("right");
    expect(await app.frame()).toContain(`< ${next.replaceAll("_", " ")} >`);
    expect(await backgroundAt(app)).toEqual(
      rgb(themes[next as keyof typeof themes].bg),
    );

    app.mockInput.pressArrow("left");
    expect(await backgroundAt(app)).toEqual(rgb(themes.serika_dark.bg));

    config.set("theme", "nord");
    expect(await backgroundAt(app)).toEqual(rgb(themes.nord.bg));
    await config.flush();
    expect((await openConfigStore(file)).config.theme).toBe("nord");
  });

  test("switches to custom theme colours", async () => {
    const config = await openConfigStore(join(await tempDir(), "config.json"));
    const app = await renderApp({ config });
    config.set("customThemeColors", [
      "#102030",
      ...config.config.customThemeColors.slice(1),
    ] as never);
    config.set("customTheme", true);
    expect(await backgroundAt(app)).toEqual([16, 32, 48]);
    expect(await app.frame()).toContain("custom");
    await config.flush();
  });
});
