import { describe, expect, test } from "bun:test";

import { parseCliOptions } from "../src/cli/options";

describe("CLI options", () => {
  test("parses informational flags and account commands", () => {
    expect(parseCliOptions(["-h"]).help).toBe(true);
    expect(parseCliOptions(["--version"]).version).toBe(true);
    expect(parseCliOptions(["login", "--debug"]).command).toBe("login");
    expect(parseCliOptions(["logout"]).command).toBe("logout");
    expect(parseCliOptions([]).config).toEqual({});
  });
  test("infers modes and validates against shared config", () => {
    expect(
      parseCliOptions([
        "--time",
        "15",
        "--language",
        "french",
        "--theme",
        "serika_dark",
        "--numbers",
      ]).config,
    ).toEqual({
      mode: "time",
      time: 15,
      language: "french",
      theme: "serika_dark",
      numbers: true,
    });
    expect(parseCliOptions(["--words=0", "--punctuation"]).config).toEqual({
      mode: "words",
      words: 0,
      punctuation: true,
    });
    expect(parseCliOptions(["--quote-length", "2"]).config).toEqual({
      mode: "quote",
      quoteLength: [2],
    });
  });
  test.each(
    [
      ["--unknown"],
      ["signup"],
      ["login", "logout"],
      ["login", "--mode", "time"],
      ["--time", "15", "--words", "10"],
      ["--mode", "zen", "--time", "15"],
      ["--mode", "words", "--quote-length", "1"],
      ["--mode", "invalid"],
      ["--time", "-1"],
      ["--time", "1.5"],
      ["--words", ""],
      ["--words", "Infinity"],
      ["--time", "9007199254740992"],
      ["--quote-length", "4"],
      ["--language", "unknown"],
      ["--theme", "unknown"],
      ["--time"],
    ].map((args) => ({ args })),
  )("rejects invalid invocation %j", ({ args }) => {
    expect(() => parseCliOptions(args)).toThrow();
  });
});
