import type { CursorStyle } from "@opentui/core";
import type { Config } from "@oxytype/schemas/configs";

/** Native terminal cursor; unsupported web shapes use a line. */
export function terminalCaretStyle(style: Config["caretStyle"]): CursorStyle {
  if (style === "block" || style === "outline") return "block";
  if (style === "underline") return "underline";
  return "line";
}
