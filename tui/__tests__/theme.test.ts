import { getDefaultConfig } from "@oxytype/typing-core/config/default-config";
import { themes } from "@oxytype/typing-core/themes";
import { describe, expect, test } from "bun:test";
import { parseHex } from "../src/theme/color";
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

  test("convert every built-in theme to RGB", () => {
    for (const name of Object.keys(themes) as (keyof typeof themes)[]) {
      const theme = toTerminalTheme({ ...config, theme: name });
      const bg = parseHex(themes[name].bg);
      expect(theme.colors.bg.toInts().slice(0, 3)).toEqual([bg.r, bg.g, bg.b]);
      expect(theme.colors.bg.intent).toBe("rgb");
    }
  });
  test("composite translucent colours onto the background", () => {
    const theme = toTerminalTheme({
      ...config,
      customTheme: true,
      customThemeColors: [
        "#000000",
        "#ffffff80",
        ...config.customThemeColors.slice(2),
      ] as typeof config.customThemeColors,
    });
    expect(theme.colors.main.toInts()).toEqual([128, 128, 128, 255]);
  });
});
