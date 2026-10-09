import type { Config } from "@oxytype/schemas/configs";
import type { ColorName, Theme } from "@oxytype/typing-core/themes";
import {
  convertCustomColorsToTheme,
  themes,
} from "@oxytype/typing-core/themes";
import { RGBA } from "@opentui/core";
import type { Accessor } from "solid-js";
import { createContext, createMemo, useContext } from "solid-js";
import { blend, parseHex } from "./color";

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

/**
 * OpenTUI emits RGB on truecolor terminals and downsamples to xterm-256
 * otherwise, so themes only resolve palettes to opaque RGB.
 */
export function toTerminalTheme(config: ThemeConfig): TerminalTheme {
  const { name, palette } = resolvePalette(config);
  // The page background is opaque; other colours composite onto it.
  const bg = blend(parseHex(palette.bg), { r: 0, g: 0, b: 0 });
  const color = (hex: string): RGBA => {
    const { r, g, b } = blend(parseHex(hex), bg);
    return RGBA.fromInts(r, g, b);
  };

  return {
    name,
    colors: {
      bg: RGBA.fromInts(bg.r, bg.g, bg.b),
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

export function createTheme(config: ThemeConfig): Accessor<TerminalTheme> {
  return createMemo(() => toTerminalTheme(config));
}

export const ThemeContext = createContext<Accessor<TerminalTheme>>();

export function useTheme(): Accessor<TerminalTheme> {
  const theme = useContext(ThemeContext);
  if (theme === undefined) throw new Error("useTheme outside ThemeContext");
  return theme;
}
