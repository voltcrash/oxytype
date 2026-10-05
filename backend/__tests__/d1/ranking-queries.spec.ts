import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";
import { createTestRuntime, seedUser } from "./helpers";
import { withRuntime } from "../../src/runtime/env";
import { statement } from "../../src/db/client";
import {
  rankingQuery,
  rankingUser,
  type RankingRow,
} from "../../src/db/ranking";

describe("individual leaderboard ranks", () => {
  let test: Awaited<ReturnType<typeof createTestRuntime>>;
  const period = 1;
  const board = "english:time:30";

  beforeAll(async () => {
    test = await createTestRuntime();
    for (const uid of ["a", "b", "c", "d", "expired"]) {
      await seedUser(test.env, uid);
    }
    await withRuntime(test.env, async () => {
      const entries = [
        ["a", 100],
        ["b", 100],
        ["c", 80],
        ["d", 60],
        ["expired", 200],
      ] as const;
      for (const [uid, score] of entries) {
        const expiry = uid === "expired" ? 1 : Date.now() + 60_000;
        const data = JSON.stringify({ uid, wpm: score });
        await statement(
          "INSERT INTO daily_entries(board,period,uid,score,expires_at,data) VALUES(?,?,?,?,?,?)",
          board,
          period,
          uid,
          score,
          expiry,
          data,
        ).run();
        await statement(
          "INSERT INTO weekly_entries(period,uid,xp,time_typed_seconds,expires_at,data) VALUES(?,?,?,?,?,?)",
          period,
          uid,
          score,
          10,
          expiry,
          data,
        ).run();
      }
      await statement(
        "INSERT INTO daily_entries(board,period,uid,score,expires_at,data) VALUES('other',1,'a',999,9999999999999,'{}'),(?,2,'a',999,9999999999999,'{}')",
        board,
      ).run();
      await statement(
        "INSERT INTO weekly_entries(period,uid,xp,time_typed_seconds,expires_at,data) VALUES(2,'a',999,10,9999999999999,'{}')",
      ).run();
    });
  });
  afterAll(async () => await test?.dispose());

  for (const table of ["daily_entries", "weekly_entries"] as const) {
    it(`matches page ranks for ${table}, including ties, expiry and friend filters`, async () => {
      await withRuntime(test.env, async () => {
        const selectedBoard = table === "daily_entries" ? board : undefined;
        for (const userIds of [
          undefined,
          [],
          ["a", "c"],
          ["b", "c", "d"],
          ["c", "c", "missing", "expired"],
        ]) {
          const { query, values } = rankingQuery(
            table,
            period,
            selectedBoard,
            userIds,
          );
          const expected = await statement(
            `${query} SELECT * FROM filtered ORDER BY rank`,
            ...values,
          ).all<RankingRow>();
          for (const uid of ["a", "b", "c", "d", "expired", "missing"]) {
            expect(
              await rankingUser(table, period, uid, selectedBoard, userIds),
            ).toEqual(expected.results.find((row) => row.uid === uid) ?? null);
          }
        }
        expect(
          await rankingUser(table, period, "a", selectedBoard),
        ).toMatchObject({
          rank: 2,
          score: 100,
        });
        expect(
          await rankingUser(table, period, "c", selectedBoard, ["a", "c"]),
        ).toMatchObject({ rank: 3, friendsRank: 2 });
      });
    });
  }
});
