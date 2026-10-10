import { getDefaultConfig } from "@oxytype/typing-core/config/default-config";
import { describe, expect, test } from "bun:test";

import type { FinishedTest } from "../src/test/typing-test";

import { sparkline, ResultChart } from "../src/results/chart";
import { braillePlot, errorColumns } from "../src/results/plot";
import { createTheme, ThemeContext } from "../src/theme/theme";
import { renderTui } from "./helpers/render";

describe("result chart", () => {
  test("buckets samples into columns and preserves error peaks", () => {
    expect(sparkline([0, 10, 20, 30], 4, 30)).toBe("▁▃▆█");
    expect(sparkline([0, 10, 0, 0], 2, 10, true)).toBe("█▁");
    expect(sparkline([], 10, 10)).toBe("no samples");
    expect(sparkline([60, 70, 80], 3, 80, false, 60)).toBe("▁▅█");
    expect(sparkline([60, 60], 2, 60, false, 60)).toBe("▁▁");
  });
  for (const seconds of [15, 120]) {
    test(`renders ${seconds} second charts within 80 columns`, async () => {
      const values = Array.from(
        { length: seconds },
        (_, index) => 60 + (index % 20),
      );
      const finished = {
        result: {
          testDuration: seconds,
          chartData: { wpm: values, burst: values, err: values.map(() => 0) },
        },
        rawHistory: values,
      } as FinishedTest;
      const theme = createTheme(getDefaultConfig());
      const app = await renderTui(() => (
        <ThemeContext.Provider value={theme}>
          <ResultChart test={finished} width={78} startAtZero={false} />
        </ThemeContext.Provider>
      ));
      const frame = await app.frame();
      expect(frame).toContain(`${seconds}.0s`);
      expect(frame).toContain("── raw   ── wpm   x errors");
      // The y axis runs from the slowest second to the fastest.
      expect(frame).toMatch(
        new RegExp(`^ *${Math.max(...values)} [⠀-⣿ ]`, "m"),
      );
      expect(frame).toMatch(/^ *60 [⠀-⣿ ]/m);
      for (const line of frame.split("\n")) {
        expect(line.trimEnd().length).toBeLessThanOrEqual(78);
      }
    });
  }
});

describe("braille plot", () => {
  test("draws a rising line from bottom left to top right", () => {
    const rows = braillePlot([[0, 10]], 2, 1, 0, 10);
    expect(rows).toHaveLength(1);
    // Dots climb from the bottom-left to the top-right pixel.
    expect(rows[0]?.map((cell) => cell.char).join("")).toBe("⣠⠞");
    expect(rows[0]?.every((cell) => cell.series === 0)).toBe(true);
  });
  test("later series own shared cells", () => {
    const rows = braillePlot([[5], [5]], 1, 1, 0, 10);
    expect(rows[0]?.[0]?.series).toBe(1);
  });
  test("marks error columns under their samples", () => {
    expect(errorColumns([0, 2, 0, 1], 7)).toEqual([
      false,
      false,
      true,
      false,
      false,
      false,
      true,
    ]);
  });
});
