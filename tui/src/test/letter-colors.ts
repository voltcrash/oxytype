import type { Config } from "@oxytype/schemas/configs";
import type { RGBA } from "@opentui/core";

import type { TerminalTheme } from "../theme/theme";
import type { Cell } from "./layout";

export type LetterColorConfig = Pick<
  Config,
  "flipTestColors" | "colorfulMode" | "highlightMode" | "blindMode"
>;

/** Where a word sits relative to the active word. */
export type WordContext = {
  activeIndex: number;
  /** Committed with errors, or active with an incorrect letter. */
  hasError: (wordIndex: number) => boolean;
};

const highlightedAhead: Partial<Record<Config["highlightMode"], number>> = {
  word: 0,
  next_word: 1,
  next_two_words: 2,
  next_three_words: 3,
};

/** Web letter colours, including flipped and colorful modes. */
// oxlint-disable-next-line typescript/consistent-return -- exhaustive Cell kind switch
function letterColor(
  kind: Cell["kind"],
  colors: TerminalTheme["colors"],
  config: Pick<Config, "flipTestColors" | "colorfulMode">,
): RGBA {
  const flipped = config.flipTestColors;
  const colorful = config.colorfulMode;
  switch (kind) {
    case "correct":
      if (flipped) return colors.sub;
      return colorful ? colors.main : colors.text;
    case "incorrect":
      return colorful ? colors.colorfulError : colors.error;
    case "extra":
      return colorful ? colors.colorfulErrorExtra : colors.errorExtra;
    case "untyped":
      if (!flipped) return colors.sub;
      return colorful ? colors.main : colors.text;
    case "gap":
    case "newline":
      return colors.sub;
  }
}

/** Letter colour after the web's highlight mode rules. */
export function cellColor(
  cell: Pick<Cell, "kind" | "wordIndex">,
  colors: TerminalTheme["colors"],
  config: LetterColorConfig,
  words?: WordContext,
): RGBA {
  const base = letterColor(cell.kind, colors, config);
  if (cell.kind === "gap" || cell.kind === "newline") return base;
  const untyped = letterColor("untyped", colors, config);
  if (config.highlightMode === "off") {
    return cell.kind === "correct" ||
      (config.blindMode && cell.kind === "incorrect")
      ? untyped
      : base;
  }
  const ahead = highlightedAhead[config.highlightMode];
  if (ahead === undefined || words === undefined) return base;
  const offset = cell.wordIndex - words.activeIndex;
  if (offset > ahead) return base;
  if (!config.blindMode && offset <= 0 && words.hasError(cell.wordIndex)) {
    return letterColor("incorrect", colors, config);
  }
  return offset < 0 ? untyped : letterColor("correct", colors, config);
}

/** Typed words under the typed effect: hidden, dots or unchanged. */
export function typedEffectCell(
  cell: Pick<Cell, "char" | "width" | "kind">,
  colors: TerminalTheme["colors"],
  config: Pick<Config, "typedEffect" | "colorfulMode" | "blindMode">,
): { char: string; fg?: RGBA } | undefined {
  if (config.typedEffect === "keep" || cell.kind === "gap") return undefined;
  if (config.typedEffect === "hide" || config.typedEffect === "fade") {
    return { char: " ".repeat(cell.width) };
  }
  const error =
    !config.blindMode && (cell.kind === "incorrect" || cell.kind === "extra");
  return {
    char: "•".padEnd(cell.width),
    fg: error
      ? config.colorfulMode
        ? colors.colorfulError
        : colors.error
      : config.colorfulMode
        ? colors.main
        : colors.text,
  };
}
