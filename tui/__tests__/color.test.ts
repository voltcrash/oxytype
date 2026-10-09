import { describe, expect, test } from "bun:test";
import { blend, parseHex, toHex } from "../src/theme/color";

describe("theme colours", () => {
  test("parse every hex form", () => {
    expect(parseHex("#e2b714")).toEqual({ r: 226, g: 183, b: 20, a: 1 });
    expect(parseHex("#FFF")).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(parseHex("#0008")).toEqual({ r: 0, g: 0, b: 0, a: 136 / 255 });
    expect(parseHex("#11223380").a).toBeCloseTo(0.5, 2);
    expect(() => parseHex("e2b714")).toThrow("Invalid hex colour");
  });

  test("composite translucent colours onto the background", () => {
    const white = { r: 255, g: 255, b: 255 };
    expect(blend({ r: 0, g: 0, b: 0, a: 0.5 }, white)).toEqual({
      r: 128,
      g: 128,
      b: 128,
    });
    expect(blend({ r: 10, g: 20, b: 30, a: 1 }, white)).toEqual({
      r: 10,
      g: 20,
      b: 30,
    });
    expect(toHex({ r: 1, g: 171, b: 255 })).toBe("#01abff");
  });
});
