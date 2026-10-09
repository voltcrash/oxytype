import { describe, expect, test } from "bun:test";
import {
  ansi256ToRgb,
  blend,
  nearestAnsi256,
  parseHex,
  toHex,
} from "../src/theme/color";

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

  test("map xterm indexes to RGB", () => {
    expect(ansi256ToRgb(16)).toEqual({ r: 0, g: 0, b: 0 });
    expect(ansi256ToRgb(196)).toEqual({ r: 255, g: 0, b: 0 });
    expect(ansi256ToRgb(231)).toEqual({ r: 255, g: 255, b: 255 });
    expect(ansi256ToRgb(232)).toEqual({ r: 8, g: 8, b: 8 });
    expect(ansi256ToRgb(255)).toEqual({ r: 238, g: 238, b: 238 });
  });

  test("pick the nearest cube or greyscale index", () => {
    expect(nearestAnsi256({ r: 255, g: 0, b: 0 })).toBe(196);
    expect(nearestAnsi256({ r: 0, g: 0, b: 0 })).toBe(16);
    expect(nearestAnsi256({ r: 50, g: 52, b: 55 })).toBe(236);
    for (let index = 16; index < 256; index++) {
      expect(nearestAnsi256(ansi256ToRgb(index))).toBeOneOf([
        index,
        // Cube and greyscale ramps share exact black/white-adjacent values.
        ...[16, 231].filter(
          (it) => toHex(ansi256ToRgb(it)) === toHex(ansi256ToRgb(index)),
        ),
      ]);
    }
  });
});
