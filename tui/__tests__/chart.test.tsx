import { getDefaultConfig } from "@oxytype/typing-core/config/default-config";
import { describe, expect, test } from "bun:test";

import type { FinishedTest } from "../src/test/typing-test";

import { sparkline, ResultChart } from "../src/results/chart";
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
      expect(await app.frame()).toContain(`0s → ${seconds}.0s`);
      expect(await app.frame()).toContain("speed 60–");
      expect(
        (await app.frame()).split("\n")[0]?.trimEnd().length,
      ).toBeLessThanOrEqual(78);
    });
  }
});
