export type ColorDepth = "truecolor" | "256";

type Env = Record<string, string | undefined>;

const truecolorPrograms = new Set([
  "iTerm.app",
  "WezTerm",
  "vscode",
  "ghostty",
]);

/** `OXYTYPE_COLOR_DEPTH=truecolor|256` overrides detection. */
export function detectColorDepth(env: Env = process.env): ColorDepth {
  const override = env["OXYTYPE_COLOR_DEPTH"];
  if (override === "truecolor" || override === "256") return override;

  const colorterm = env["COLORTERM"]?.toLowerCase();
  if (colorterm === "truecolor" || colorterm === "24bit") return "truecolor";
  if (env["WT_SESSION"] !== undefined) return "truecolor";
  if (truecolorPrograms.has(env["TERM_PROGRAM"] ?? "")) return "truecolor";
  if (env["TERM"]?.endsWith("-direct") === true) return "truecolor";
  return "256";
}
