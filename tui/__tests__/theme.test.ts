import { getDefaultConfig } from "@oxytype/typing-core/config/default-config";
import { themes } from "@oxytype/typing-core/themes";
import { describe, expect, test } from "bun:test";
import { nearestAnsi256, parseHex } from "../src/theme/color";
import { resolvePalette, toTerminalTheme } from "../src/theme/theme";

const config = getDefaultConfig();

describe("terminal themes", () => {
  test("resolve built-in and custom palettes", () => {
    expect(resolvePalette({ ...config, theme: "nord" })).toEqual({
      name: "nord",
      palette: themes.nord,
    });
    const custom = resolvePalette({ ...config, customTheme: true });
    expect(custom.name).toBe("custom");
    expect(custom.palette.bg).toBe(config.customThemeColors[0]);
    expect(custom.palette.colorfulErrorExtra).toBe(config.customThemeColors[9]);
  });

  test("convert every built-in theme to truecolor", () => {
    for (const name of Object.keys(themes) as (keyof typeof themes)[]) {
      const theme = toTerminalTheme({ ...config, theme: name }, "truecolor");
      const bg = parseHex(themes[name].bg);
      expect(theme.colors.bg.toInts().slice(0, 3)).toEqual([bg.r, bg.g, bg.b]);
      expect(theme.colors.bg.intent).toBe("rgb");
    }
  });

  test("use indexed colours for 256-colour terminals", () => {
    const theme = toTerminalTheme(config, "256");
    expect(theme.name).toBe("serika_dark");
    expect(theme.colors.main.intent).toBe("indexed");
    expect(theme.colors.main.slot).toBe(
      nearestAnsi256(parseHex(themes.serika_dark.main)),
    );
  });
});
