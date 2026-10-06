import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, it } from "vite-plus/test";
import { createTestRuntime } from "./helpers";

it("removes legacy hashes and settings while preserving replay fingerprints and progression", async () => {
  const userData = {
    xp: 250,
    completedTests: 2,
    personalBests: { time: { "30": [{ wpm: 80 }] } },
    lastTimingHashes: ["timing-fingerprint"],
  };
  const users = [
    {
      uid: "history",
      input: { ...userData, lastReultHashes: ["payload-hash"] },
      version: 8,
    },
    { uid: "empty", input: { ...userData, lastReultHashes: [] }, version: 8 },
    { uid: "null", input: { ...userData, lastReultHashes: null }, version: 8 },
    { uid: "clean", input: userData, version: 7 },
  ];
  const configuration = {
    users: { signUp: true, autoBan: { enabled: false } },
    results: { savingEnabled: true, objectHashCheckEnabled: true },
    anticheat: { replayCheck: { enabled: true, maxFingerprints: 50 } },
  };
  const configs = [
    {
      id: "main",
      input: {
        ...configuration,
        users: {
          ...configuration.users,
          lastHashesCheck: { enabled: true, maxHashes: 50 },
        },
      },
      version: 4,
    },
    {
      id: "disabled",
      input: {
        ...configuration,
        users: {
          ...configuration.users,
          lastHashesCheck: { enabled: false, maxHashes: 0 },
        },
      },
      version: 4,
    },
    { id: "clean", input: configuration, version: 3 },
  ];
  const test = await createTestRuntime({
    beforeMigration: async (db, file) => {
      if (file !== "0008_remove_legacy_result_hashes.sql") return;
      await db.batch([
        ...users.map(({ uid, input }) =>
          db
            .prepare(
              "INSERT INTO users(uid,id,name,name_key,email,added_at,xp,completed_tests,version,data) VALUES(?,?,?,?,?,0,250,2,7,?)",
            )
            .bind(
              uid,
              uid,
              uid,
              uid,
              `${uid}@example.test`,
              JSON.stringify(input),
            ),
        ),
        ...configs.map(({ id, input }) =>
          db
            .prepare("INSERT INTO configuration(id,version,data) VALUES(?,3,?)")
            .bind(id, JSON.stringify(input)),
        ),
        db.prepare(
          "INSERT INTO results(id,uid,timestamp,mode,mode2,language,wpm,acc,submission_hash,data) VALUES('result','history',123,'time','30','english',80,95,'saved-submission','{}')",
        ),
      ]);
    },
  });

  try {
    const verify = async (): Promise<void> => {
      const userRows = await test.env.DB.prepare(
        "SELECT uid,xp,completed_tests,version,data FROM users",
      ).all<{
        uid: string;
        xp: number;
        completed_tests: number;
        version: number;
        data: string;
      }>();
      expect(userRows.results).toHaveLength(users.length);
      for (const { uid, version } of users) {
        const row = userRows.results.find((user) => user.uid === uid);
        expect(row).toMatchObject({
          uid,
          xp: 250,
          completed_tests: 2,
          version,
        });
        expect(JSON.parse(row?.data ?? "null")).toEqual(userData);
      }
      const configRows = await test.env.DB.prepare(
        "SELECT id,version,data FROM configuration",
      ).all<{ id: string; version: number; data: string }>();
      expect(configRows.results).toHaveLength(configs.length);
      for (const { id, version } of configs) {
        const row = configRows.results.find((config) => config.id === id);
        expect(row).toMatchObject({ id, version });
        expect(JSON.parse(row?.data ?? "null")).toEqual(configuration);
      }
      const resultRows = await test.env.DB.prepare(
        "SELECT * FROM results",
      ).all();
      expect(resultRows.results).toEqual([
        {
          id: "result",
          uid: "history",
          timestamp: 123,
          mode: "time",
          mode2: "30",
          language: "english",
          wpm: 80,
          acc: 95,
          submission_hash: "saved-submission",
          data: "{}",
        },
      ]);
      expect(
        (await test.env.DB.prepare("PRAGMA foreign_key_check").all()).results,
      ).toHaveLength(0);
    };
    await verify();
    const migration = await readFile(
      resolve(
        __dirname,
        "../../migrations/0008_remove_legacy_result_hashes.sql",
      ),
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
