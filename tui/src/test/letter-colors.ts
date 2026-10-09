import type { Config } from "@oxytype/schemas/configs";
import type { RGBA } from "@opentui/core";

import type { TerminalTheme } from "../theme/theme";
import type { Cell } from "./layout";

export type LetterColorConfig = Pick<Config, "flipTestColors" | "colorfulMode">;

/** Web letter colours, including flipped and colorful modes. */
// oxlint-disable-next-line typescript/consistent-return -- exhaustive Cell kind switch
export function cellColor(
  kind: Cell["kind"],
  colors: TerminalTheme["colors"],
  config: LetterColorConfig,
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
