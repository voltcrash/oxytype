import { ConfigSchema, type PartialConfig } from "@oxytype/schemas/configs";
import { parseArgs } from "node:util";

export type CliOptions = {
  command: "play" | "login" | "logout";
  help: boolean;
  version: boolean;
  debug: boolean;
  config: PartialConfig;
};

export const help = `Usage: oxytype [options]
       oxytype login|logout [--debug]

Options:
  -h, --help           Show help
  -v, --version        Show version
      --debug          Include request timing in local logs
      --mode MODE      time, words, quote, zen, custom
      --time SECONDS   Time mode duration (0 = unlimited)
      --words COUNT    Words mode count (0 = unlimited)
      --language NAME  Language identifier, e.g. english or french
      --theme NAME     Built-in theme identifier
      --quote-length N Quote length: 0 short, 1 medium, 2 long, 3 thicc
      --punctuation    Enable punctuation
      --numbers        Enable numbers

Test flags update saved settings after the initial session/config check.
Requires Bun >=1.3.0 and an interactive terminal of at least 80x20.
Ctrl+P palette · Ctrl+A account · Ctrl+S settings · Ctrl+C quit
Docs: https://github.com/voltcrash/oxytype/blob/main/docs/TUI.md
`;

export function parseCliOptions(args: string[]): CliOptions {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    strict: true,
    options: {
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
      debug: { type: "boolean" },
      mode: { type: "string" },
      time: { type: "string" },
      words: { type: "string" },
      language: { type: "string" },
      theme: { type: "string" },
      "quote-length": { type: "string" },
      punctuation: { type: "boolean" },
      numbers: { type: "boolean" },
    },
  });
  const command = positionals[0] ?? "play";
  if (
    positionals.length > 1 ||
    !["play", "login", "logout"].includes(command)
  ) {
    throw new Error("Expected login, logout or no command");
  }
  if (values.time !== undefined && values.words !== undefined) {
    throw new Error("Choose --time or --words");
  }
  const amountMode =
    values.time !== undefined
      ? "time"
      : values.words !== undefined
        ? "words"
        : undefined;
  if (
    amountMode !== undefined &&
    values.mode !== undefined &&
    values.mode !== amountMode
  ) {
    throw new Error(`--${amountMode} requires --mode ${amountMode}`);
  }
  const quoteLength = values["quote-length"];
  if (
    quoteLength !== undefined &&
    (amountMode !== undefined ||
      (values.mode !== undefined && values.mode !== "quote"))
  ) {
    throw new Error("--quote-length requires --mode quote");
  }
  const numeric = (value: string): number => {
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) {
      throw new Error("Counts and durations must be nonnegative integers");
    }
    return Number(value);
  };
  const parsed = ConfigSchema.partial().safeParse({
    ...(values.mode === undefined &&
    amountMode === undefined &&
    quoteLength === undefined
      ? {}
      : { mode: values.mode ?? amountMode ?? "quote" }),
    ...(values.time === undefined ? {} : { time: numeric(values.time) }),
    ...(values.words === undefined ? {} : { words: numeric(values.words) }),
    ...(values.language === undefined ? {} : { language: values.language }),
    ...(values.theme === undefined ? {} : { theme: values.theme }),
    ...(quoteLength === undefined
      ? {}
      : { quoteLength: [numeric(quoteLength)] }),
    ...(values.punctuation === undefined
      ? {}
      : { punctuation: values.punctuation }),
    ...(values.numbers === undefined ? {} : { numbers: values.numbers }),
  });
  if (!parsed.success) {
    throw new Error("Invalid test option; see --help for accepted values");
  }
  if (command !== "play" && Object.keys(parsed.data).length > 0) {
    throw new Error("Test options only apply when starting a test");
  }
  return {
    command: command as CliOptions["command"],
    help: values.help ?? false,
    version: values.version ?? false,
    debug: values.debug ?? false,
    config: parsed.data,
  };
}
