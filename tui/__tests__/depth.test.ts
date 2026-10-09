import { describe, expect, test } from "bun:test";
import { detectColorDepth } from "../src/theme/depth";

describe("detectColorDepth", () => {
  test("detects truecolor terminals", () => {
    expect(detectColorDepth({ COLORTERM: "truecolor" })).toBe("truecolor");
    expect(detectColorDepth({ COLORTERM: "24BIT" })).toBe("truecolor");
    expect(detectColorDepth({ WT_SESSION: "1" })).toBe("truecolor");
    expect(detectColorDepth({ TERM_PROGRAM: "iTerm.app" })).toBe("truecolor");
    expect(detectColorDepth({ TERM: "xterm-direct" })).toBe("truecolor");
  });

  test("falls back to 256 colours", () => {
    expect(detectColorDepth({})).toBe("256");
    expect(detectColorDepth({ TERM: "xterm-256color" })).toBe("256");
    expect(detectColorDepth({ TERM_PROGRAM: "Apple_Terminal" })).toBe("256");
  });

  test("honours explicit overrides", () => {
    expect(
      detectColorDepth({ OXYTYPE_COLOR_DEPTH: "256", COLORTERM: "truecolor" }),
    ).toBe("256");
    expect(detectColorDepth({ OXYTYPE_COLOR_DEPTH: "truecolor" })).toBe(
      "truecolor",
    );
    expect(detectColorDepth({ OXYTYPE_COLOR_DEPTH: "16" })).toBe("256");
  });
});
