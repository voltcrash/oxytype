import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";
import { createTestRuntime, seedUser } from "./helpers";
import { withRuntime } from "../../src/runtime/env";
import * as Users from "../../src/dal/user";
import * as Boards from "../../src/dal/leaderboards";
import * as Public from "../../src/dal/public";
import { completedEvent } from "../__testData__/completed-event";
import { BASE_CONFIGURATION } from "../../src/constants/base-configuration";
import {
  getDailyLeaderboard,
  purgeUserFromDailyLeaderboards,
} from "../../src/utils/daily-leaderboards";
import * as Weekly from "../../src/services/weekly-xp-leaderboard";

describe("client leaderboard partitions", () => {
  let test: Awaited<ReturnType<typeof createTestRuntime>>;
  beforeAll(async () => {
    test = await createTestRuntime();
    await seedUser(test.env, "ranked-client");
  });
  afterAll(async () => await test?.dispose());
  it("publishes independent all-time ranks and histograms", async () => {
    await withRuntime(test.env, async () => {
      const user = await Users.getUser("ranked-client", "test");
      for (const [client, wpm] of [
        ["web", 100],
        ["tui", 60],
      ] as const) {
        await Users.updateTypingStats(user.uid, 0, 30, client);
        await Users.checkIfPb(
          user.uid,
          user,
          completedEvent({ client, wpm, mode2: "15" }),
        );
        await Boards.update("time", "15", "english", client);
        expect(
          await Boards.getRank("time", "15", "english", user.uid, client),
        ).toMatchObject({ wpm, rank: 1 });
        expect(await Boards.getCount("time", "15", "english", client)).toBe(1);
        expect(
          await Public.getSpeedHistogram("english", "time", "15", client),
        ).toEqual({ [wpm]: 1 });
      }
    });
  });
  it("separates daily and weekly scores, ranks and scheduled reward contexts", async () => {
    await withRuntime(test.env, async () => {
      const dailyConfig = {
        ...BASE_CONFIGURATION.dailyLeaderboards,
        enabled: true,
      };
      const weeklyConfig = {
        ...BASE_CONFIGURATION.leaderboards.weeklyXp,
        enabled: true,
      };
      for (const [client, wpm, xp] of [
        ["web", 100, 200],
        ["tui", 60, 50],
      ] as const) {
        const daily = getDailyLeaderboard(
          "english",
          "time",
          "15",
          dailyConfig,
          -1,
          client,
        );
        expect(daily).not.toBeNull();
        await daily?.addResult(
          {
            uid: "ranked-client",
            name: "ranked-client",
            wpm,
            raw: wpm,
            acc: 100,
            consistency: 100,
            timestamp: Date.now(),
          },
          dailyConfig,
        );
        expect(
          await daily?.getRank("ranked-client", dailyConfig),
        ).toMatchObject({ wpm, rank: 1 });
        const weekly = Weekly.get(weeklyConfig, undefined, client);
        await weekly?.addResult(weeklyConfig, {
          entry: {
            uid: "ranked-client",
            name: "ranked-client",
            lastActivityTimestamp: Date.now(),
            timeTypedSeconds: 30,
          },
          xpGained: xp,
        });
        expect(
          await weekly?.getRank("ranked-client", weeklyConfig),
        ).toMatchObject({ totalXp: xp, rank: 1 });
        expect(
          (await weekly?.getResults(0, 10, weeklyConfig, false))?.count,
        ).toBe(1);
      }
      const jobs = await test.env.DB.prepare(
        "SELECT data FROM scheduled_jobs",
      ).all<{ data: string }>();
      const contexts = jobs.results.map(
        (row) => JSON.parse(row.data) as { ctx: { client?: string } },
      );
      expect(contexts.map((row) => row.ctx.client ?? "web")).toEqual(
        expect.arrayContaining(["web", "tui"]),
      );
    });
  });
  it("clears one client's daily placements while moderation still purges both", async () => {
    await withRuntime(test.env, async () => {
      const config = { ...BASE_CONFIGURATION.dailyLeaderboards, enabled: true };
      await purgeUserFromDailyLeaderboards("ranked-client", config, "tui");
      expect(
        await getDailyLeaderboard("english", "time", "15", config)?.getRank(
          "ranked-client",
          config,
        ),
      ).toMatchObject({ wpm: 100 });
      expect(
        await getDailyLeaderboard(
          "english",
          "time",
          "15",
          config,
          -1,
          "tui",
        )?.getRank("ranked-client", config),
      ).toBeNull();
      await purgeUserFromDailyLeaderboards("ranked-client", config);
      expect(
        await getDailyLeaderboard("english", "time", "15", config)?.getRank(
          "ranked-client",
          config,
        ),
      ).toBeNull();
    });
  });
});
