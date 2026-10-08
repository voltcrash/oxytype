import { BASE_CONFIGURATION } from "../../src/constants/base-configuration";
import { buildMonkeyMail } from "../../src/utils/monkey-mail";
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";
import { createTestRuntime, seedUser } from "./helpers";
import { withRuntime } from "../../src/runtime/env";
import * as Users from "../../src/dal/user";
import * as Public from "../../src/dal/public";
import { completedEvent } from "../__testData__/completed-event";
import { mutateUser } from "../../src/db/mutation";
import { getCurrentDayTimestamp } from "@oxytype/util/date-and-time";

describe("client-scoped account progression", () => {
  let test: Awaited<ReturnType<typeof createTestRuntime>>;
  beforeAll(async () => {
    test = await createTestRuntime({
      beforeMigration: async (db, file) => {
        if (file !== "0010_client_profiles.sql") return;
        const data = {
          uid: "legacy-progression",
          name: "Legacy",
          email: "legacy@example.test",
          personalBests: {
            time: { "15": [{ wpm: 100 }] },
            words: {},
            quote: {},
            zen: {},
            custom: {},
          },
          streak: { length: 8, maxLength: 10, lastResultTimestamp: 1000 },
          timeTyping: 120,
          completedTests: 4,
          startedTests: 5,
          xp: 200,
        };
        await db
          .prepare(
            "INSERT INTO users(uid,id,name,name_key,email,added_at,time_typing,completed_tests,started_tests,xp,data) VALUES('legacy-progression','legacy-progression','Legacy','legacy','legacy@example.test',0,120,4,5,200,?)",
          )
          .bind(JSON.stringify(data))
          .run();
      },
    });
    for (const uid of ["profiles", "streaks", "reset-clients"]) {
      await seedUser(test.env, uid);
    }
  });
  afterAll(async () => await test?.dispose());
  it("backfills web progression while leaving terminal accounts empty", async () => {
    const row = await test.env.DB.prepare(
      "SELECT client,time_typing,data FROM client_profiles WHERE uid='legacy-progression'",
    ).first<{ client: string; time_typing: number; data: string }>();
    expect(row).toMatchObject({ client: "web", time_typing: 120 });
    expect(JSON.parse(row?.data ?? "null")).toMatchObject({
      personalBests: { time: { "15": [{ wpm: 100 }] } },
      completedTests: 4,
      startedTests: 5,
      xp: 200,
      streak: { length: 8 },
    });
    await withRuntime(test.env, async () => {
      expect(await Users.getStats("legacy-progression")).toEqual({
        completedTests: 4,
        startedTests: 5,
        timeTyping: 120,
      });
      expect(await Users.getStats("legacy-progression", "tui")).toEqual({
        completedTests: 0,
        startedTests: 0,
        timeTyping: 0,
      });
    });
  });
  it("credits terminal placement rewards to terminal XP only", async () => {
    await withRuntime(test.env, async () => {
      await Users.addToInbox(
        "streaks",
        [
          buildMonkeyMail({
            subject: "placement",
            body: "fixture",
            rewards: [{ type: "xp", client: "tui", item: 50 }],
          }),
        ],
        { ...BASE_CONFIGURATION.users.inbox, enabled: true, maxMail: 10 },
      );
      const user = await Users.getUser("streaks", "test");
      const id = user.inbox?.[0]?.id;
      if (id === undefined) throw new Error("Missing mail");
      await Users.updateInbox("streaks", [id], []);
      expect((await Users.getUser("streaks", "test", "tui")).xp).toBe(50);
      expect((await Users.getUser("streaks", "test")).xp ?? 0).toBe(0);
      await Users.updateInbox("streaks", [id], []);
      expect((await Users.getUser("streaks", "test", "tui")).xp).toBe(50);
    });
  });
  it("keeps PBs and tag PBs independent, preserving shared tag names", async () => {
    await withRuntime(test.env, async () => {
      const tag = await Users.addTag("profiles", "shared");
      const user = await Users.getUser("profiles", "test");
      for (const [client, wpm] of [
        ["web", 100],
        ["tui", 60],
        ["tui", 70],
      ] as const) {
        const event = completedEvent({
          client,
          wpm,
          mode2: "15",
          tags: [tag._id],
        });
        expect(await Users.checkIfPb(user.uid, user, event)).toBe(true);
        expect(await Users.checkIfTagPb(user.uid, user, event)).toEqual([
          tag._id,
        ]);
      }
      expect(
        await Users.getPersonalBests(user.uid, "time", "15"),
      ).toMatchObject([{ wpm: 100 }]);
      expect(
        await Users.getPersonalBests(user.uid, "time", "15", "tui"),
      ).toMatchObject([{ wpm: 70 }]);
      expect((await Users.getTags(user.uid, "tui"))[0]).toMatchObject({
        name: "shared",
        personalBests: { time: { "15": [{ wpm: 70 }] } },
      });
      await Users.removeTagPb(user.uid, tag._id, "tui");
      expect(
        (await Users.getTags(user.uid, "tui"))[0]?.personalBests?.time,
      ).toEqual({});
      expect(
        (await Users.getTags(user.uid))[0]?.personalBests?.time[15],
      ).toMatchObject([{ wpm: 100 }]);
      await Users.clearPb(user.uid, "tui");
      expect(
        await Users.getPersonalBests(user.uid, "time", "15", "tui"),
      ).toBeUndefined();
      expect(
        await Users.getPersonalBests(user.uid, "time", "15"),
      ).toMatchObject([{ wpm: 100 }]);
    });
  });
  it("commits concurrent stats and XP updates to their own partitions", async () => {
    await withRuntime(test.env, async () => {
      await Promise.all([
        Users.updateTypingStats("profiles", 2, 30),
        Users.updateTypingStats("profiles", 1, 20, "tui"),
      ]);
      await Promise.all([
        Users.incrementXp("profiles", 200),
        Users.incrementXp("profiles", 50, "tui"),
      ]);
      expect(await Users.getStats("profiles")).toEqual({
        startedTests: 3,
        completedTests: 1,
        timeTyping: 30,
      });
      expect(await Users.getStats("profiles", "tui")).toEqual({
        startedTests: 2,
        completedTests: 1,
        timeTyping: 20,
      });
      expect((await Users.getUser("profiles", "test", "tui")).xp).toBe(50);
      expect((await Users.getUserByName("profiles", "test")).xp).toBe(200);
      await Public.updateStats(2, 30);
      await Public.updateStats(1, 20, "tui");
      expect(await Public.getTypingStats()).toMatchObject({
        testsStarted: 3,
        testsCompleted: 1,
        timeTyping: 30,
      });
      expect(await Public.getTypingStats("tui")).toMatchObject({
        testsStarted: 2,
        testsCompleted: 1,
        timeTyping: 20,
      });
    });
  });
  it("isolates streak offsets and daily activity", async () => {
    await withRuntime(test.env, async () => {
      const now = Date.now();
      await mutateUser("streaks", (user) => {
        user.streak = {
          length: 4,
          maxLength: 4,
          lastResultTimestamp: getCurrentDayTimestamp() - 86400000,
        };
      });
      expect(await Users.updateStreak("streaks", now)).toBe(5);
      expect(await Users.updateStreak("streaks", now, "tui")).toBe(1);
      await Users.setStreakHourOffset("streaks", 3, "tui");
      const user = await Users.getUser("streaks", "test");
      expect(user.streak?.hourOffset).toBeUndefined();
      expect(
        (await Users.getUser("streaks", "test", "tui")).streak?.hourOffset,
      ).toBe(3);
      await Users.incrementTestActivity(user, now);
      await Users.incrementTestActivity(user, now, "tui");
      const rows = await test.env.DB.prepare(
        "SELECT client,count FROM user_activity WHERE uid='streaks' ORDER BY client",
      ).all();
      expect(rows.results).toEqual([
        { client: "tui", count: 1 },
        { client: "web", count: 1 },
      ]);
    });
  });
  it("resets all partitions and cascades profile rows on deletion", async () => {
    await withRuntime(test.env, async () => {
      await Users.updateTypingStats("reset-clients", 1, 20, "tui");
      await Users.resetUser("reset-clients");
      expect(await Users.getStats("reset-clients", "tui")).toMatchObject({
        completedTests: 0,
      });
      expect(
        await test.env.DB.prepare(
          "SELECT count(*) AS n FROM client_profiles WHERE uid='reset-clients' AND client='tui'",
        ).first("n"),
      ).toBe(0);
      await test.env.DB.prepare("DELETE FROM users WHERE uid='profiles'").run();
      expect(
        await test.env.DB.prepare(
          "SELECT count(*) AS n FROM client_profiles WHERE uid='profiles'",
        ).first("n"),
      ).toBe(0);
    });
  });
});
