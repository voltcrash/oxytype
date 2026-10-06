import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, it } from "vite-plus/test";
import { createTestRuntime } from "./helpers";

it("removes requests, friendships, blocks, and configuration while retaining users and rankings", async () => {
  const supported = {
    users: { signUp: true },
    leaderboards: { minTimeTyping: 1234 },
  };
  const test = await createTestRuntime({
    beforeMigration: async (db, file) => {
      if (file !== "0006_remove_friends.sql") return;
      await db.batch([
        ...["owner", "pending", "accepted", "blocked"].map((uid) =>
          db
            .prepare(
              "INSERT INTO users(uid,id,name,name_key,email,added_at,data) VALUES(?,?,?,?,?,0,'{}')",
            )
            .bind(uid, uid, uid, uid, `${uid}@example.test`),
        ),
        db
          .prepare(
            "INSERT INTO configuration(id,version,data) VALUES('main',7,?)",
          )
          .bind(
            JSON.stringify({
              ...supported,
              connections: { enabled: true, maxPerUser: 100 },
            }),
          ),
        db
          .prepare(
            "INSERT INTO configuration(id,version,data) VALUES('custom',3,?)",
          )
          .bind(JSON.stringify(supported)),
        db.prepare(
          "INSERT INTO leaderboard_generations(board,generation,updated_at) VALUES('english_time_15','generation',1)",
        ),
        db.prepare(
          "INSERT INTO leaderboard_snapshots(generation,board,uid,rank,data) VALUES('generation','english_time_15','owner',1,'{}')",
        ),
        db.prepare(
          "INSERT INTO daily_entries(board,period,uid,score,expires_at,data) VALUES('english:time:15',1,'owner',100,9999999999999,'{}')",
        ),
        db.prepare(
          "INSERT INTO weekly_entries(period,uid,xp,time_typed_seconds,expires_at,data) VALUES(1,'owner',100,60,9999999999999,'{}')",
        ),
      ]);
      await db.batch(
        ["pending", "accepted", "blocked"].map((status) =>
          db
            .prepare(
              "INSERT INTO connections(id,key,initiator_uid,initiator_name,receiver_uid,receiver_name,last_modified,status) VALUES(?,?,'owner','owner',?,?,1,?)",
            )
            .bind(status, `owner/${status}`, status, status, status),
        ),
      );
    },
  });

  try {
    const verify = async (): Promise<void> => {
      const tables = await test.env.DB.prepare(
        "SELECT name FROM sqlite_master WHERE name LIKE 'connections%'",
      ).all();
      expect(tables.results).toHaveLength(0);
      const rows = await test.env.DB.prepare(
        "SELECT id,version,data FROM configuration ORDER BY id",
      ).all<{ id: string; version: number; data: string }>();
      expect(
        rows.results.map((row) => ({ ...row, data: JSON.parse(row.data) })),
      ).toEqual([
        { id: "custom", version: 3, data: supported },
        { id: "main", version: 8, data: supported },
      ]);
      expect(
        await test.env.DB.prepare("SELECT count(*) FROM users").first(
          "count(*)",
        ),
      ).toBe(4);
      for (const table of [
        "leaderboard_snapshots",
        "daily_entries",
        "weekly_entries",
      ]) {
        expect(
          await test.env.DB.prepare(`SELECT uid FROM ${table}`).first("uid"),
        ).toBe("owner");
      }
      expect(
        (await test.env.DB.prepare("PRAGMA foreign_key_check").all()).results,
      ).toHaveLength(0);
    };
    await verify();
    const migration = await readFile(
      resolve(__dirname, "../../migrations/0006_remove_friends.sql"),
      "utf8",
    );
    await test.env.DB.batch(
      migration
        .split("--> statement-breakpoint")
        .filter((query) => query.trim())
        .map((query) => test.env.DB.prepare(query)),
    );
    await verify();
  } finally {
    await test.dispose();
  }
});
