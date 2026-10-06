import { describe, it, expect } from "vite-plus/test";
import { BASE_CONFIGURATION } from "../../src/constants/base-configuration";
import { getDailyLeaderboard } from "../../src/utils/daily-leaderboards";

describe("getDailyLeaderboard", () => {
  const config = BASE_CONFIGURATION.dailyLeaderboards;

  it.each(["15", "60"])("has an english time %s board by default", (mode2) => {
    expect(getDailyLeaderboard("english", "time", mode2, config)).not.toBe(
      null,
    );
  });

  it.each([
    ["english", "time", "30"],
    ["english", "time", "150"],
    ["english", "words", "10"],
    ["english_1k", "time", "15"],
    ["spanish", "time", "60"],
  ] as const)("has no %s %s %s board by default", (language, mode, mode2) => {
    expect(getDailyLeaderboard(language, mode, mode2, config)).toBe(null);
  });

  it("has no boards while disabled", () => {
    expect(
      getDailyLeaderboard("english", "time", "15", {
        ...config,
        enabled: false,
      }),
    ).toBe(null);
  });
});
