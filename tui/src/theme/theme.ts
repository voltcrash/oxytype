import type { Config } from "@oxytype/schemas/configs";
import type { ColorName, Theme } from "@oxytype/typing-core/themes";
import {
  convertCustomColorsToTheme,
  themes,
} from "@oxytype/typing-core/themes";
import { RGBA } from "@opentui/core";
import type { Accessor } from "solid-js";
import { createContext, createMemo, useContext } from "solid-js";
import type { Rgb } from "./color";
import { blend, nearestAnsi256, parseHex, toHex } from "./color";
import type { ColorDepth } from "./depth";

export type TerminalTheme = {
  name: string;
  colors: Record<ColorName, RGBA>;
};

type ThemeConfig = Pick<Config, "theme" | "customTheme" | "customThemeColors">;

export function resolvePalette(config: ThemeConfig): {
  name: string;
  palette: Theme;
} {
  return config.customTheme
    ? {
        name: "custom",
        palette: convertCustomColorsToTheme(config.customThemeColors),
      }
    : { name: config.theme, palette: themes[config.theme] };
}

function toTerminalColor(color: Rgb, depth: ColorDepth): RGBA {
  return depth === "truecolor"
    ? RGBA.fromInts(color.r, color.g, color.b)
    : RGBA.fromIndex(nearestAnsi256(color), toHex(color));
}

export function toTerminalTheme(
  config: ThemeConfig,
  depth: ColorDepth,
): TerminalTheme {
  const { name, palette } = resolvePalette(config);
  // The page background is opaque; other colours composite onto it.
  const bg = blend(parseHex(palette.bg), { r: 0, g: 0, b: 0 });
  const color = (hex: string): RGBA =>
    toTerminalColor(blend(parseHex(hex), bg), depth);

  return {
    name,
    colors: {
      bg: toTerminalColor(bg, depth),
      main: color(palette.main),
      caret: color(palette.caret),
      sub: color(palette.sub),
      subAlt: color(palette.subAlt),
      text: color(palette.text),
      error: color(palette.error),
      errorExtra: color(palette.errorExtra),
      colorfulError: color(palette.colorfulError),
      colorfulErrorExtra: color(palette.colorfulErrorExtra),
    },
  };
}

export function createTheme(
  config: ThemeConfig,
  depth: ColorDepth,
): Accessor<TerminalTheme> {
  return createMemo(() => toTerminalTheme(config, depth));
}

export const ThemeContext = createContext<Accessor<TerminalTheme>>();

export function useTheme(): Accessor<TerminalTheme> {
  const theme = useContext(ThemeContext);
  if (theme === undefined) throw new Error("useTheme outside ThemeContext");
  return theme;
}
