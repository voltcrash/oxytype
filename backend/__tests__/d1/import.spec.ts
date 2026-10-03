import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";
import { BSON } from "mongodb";
import { createLocalD1 } from "../../scripts/local-d1";
import { mapDocument, normalize, rowSql } from "../../scripts/mongo-mapping";
import { mapRedisSnapshot } from "../../scripts/redis-mapping";

describe("offline migration preflight", () => {
  let local: Awaited<ReturnType<typeof createLocalD1>>;
  beforeAll(async () => {
    local = await createLocalD1();
  });
  afterAll(async () => await local.dispose());
  const id = "0123456789abcdef01234567";
  const user = {
    _id: new BSON.ObjectId(id),
    uid: "import-user",
    name: "Imported",
    email: "import@example.com",
    addedAt: new Date(1000),
    xp: BSON.Long.fromNumber(500),
    discordId: "removed-id",
    discordAvatar: "removed-avatar",
    personalBests: { time: {} },
    inbox: [
      {
        id: "legacy-mail",
        timestamp: 10,
        read: false,
        rewards: [{ type: "xp", item: 25 }],
      },
    ],
  };
  it("preserves BSON IDs, dates, safe integers and pending mail rewards", async () => {
    const rows = mapDocument("users", user);
    for (const row of rows) {
      await local.db.batch(rowSql(row).map((sql) => local.db.prepare(sql)));
    }
    expect(
      await local.db
        .prepare("SELECT id FROM users WHERE uid='import-user'")
        .first("id"),
    ).toBe(id);
    expect(
      await local.db
        .prepare("SELECT added_at FROM users WHERE uid='import-user'")
        .first("added_at"),
    ).toBe(1000);
    const grant = await local.db
      .prepare("SELECT data FROM reward_grants")
      .first<string>("data");
    expect(JSON.parse(grant ?? "{}")).toEqual({
      rewards: [{ type: "xp", item: 25 }],
    });
    const imported = await local.db
      .prepare("SELECT data FROM users WHERE uid='import-user'")
      .first<string>("data");
    expect(JSON.parse(imported ?? "{}")).not.toHaveProperty("discordId");
    expect(JSON.parse(imported ?? "{}")).not.toHaveProperty("discordAvatar");
    expect(() => {
      normalize(BSON.Long.fromString("9007199254740993"));
    }).toThrow("Unsafe BSON integer");
  });
  it("round-trips long escaped JSON and resumes without replacement cascades", async () => {
    const source = { ...user, note: "漢字'\n".repeat(20000) };
    const rows = mapDocument("users", source);
    const queries = rowSql(rows[0] ?? { table: "", key: [], values: {} });
    expect(queries.length).toBeGreaterThan(1);
    expect(queries.every((sql) => Buffer.byteLength(sql) < 90_000)).toBe(true);
    await local.db.batch(queries.map((sql) => local.db.prepare(sql)));
    await local.db.batch(queries.map((sql) => local.db.prepare(sql)));
    const encoded = await local.db
      .prepare("SELECT data FROM users WHERE uid='import-user'")
      .first<string>("data");
    expect(JSON.parse(encoded ?? "{}")).toMatchObject({ note: source.note });
    expect(
      await local.db
        .prepare("SELECT count(*) AS count FROM inbox")
        .first("count"),
    ).toBe(1);
  });
  it("rejects orphan records and case-folded identity conflicts", async () => {
    const orphan = mapDocument("results", {
      _id: new BSON.ObjectId(),
      uid: "missing",
      timestamp: 1,
      mode: "time",
      mode2: "15",
      wpm: 80,
      acc: 100,
    });
    await expect(
      local.db.batch(
        orphan.flatMap(rowSql).map((sql) => local.db.prepare(sql)),
      ),
    ).rejects.toThrow(/FOREIGN KEY/);
    const duplicate = mapDocument("users", {
      ...user,
      _id: new BSON.ObjectId(),
      uid: "other",
      name: "imported",
    });
    await expect(
      local.db.batch(
        rowSql(duplicate[0] ?? { table: "", key: [], values: {} }).map((sql) =>
          local.db.prepare(sql),
        ),
      ),
    ).rejects.toThrow(/UNIQUE/);
  });
  it("discards obsolete configuration, blocklist identities and active bot jobs", () => {
    const rows = mapDocument("configuration", {
      _id: id,
      users: { signUp: true, discordIntegration: { enabled: true } },
      dailyLeaderboards: { enabled: true, topResultsToAnnounce: 10 },
    });
    expect(JSON.parse(rows[0]?.values["data"] as string)).toEqual({
      users: { signUp: true },
      dailyLeaderboards: { enabled: true },
    });
    expect(
      mapDocument("blocklist", {
        _id: id,
        emailHash: "email",
        discordIdHash: "removed",
      }),
    ).toEqual([
      {
        table: "blocklist",
        key: ["kind", "hash"],
        values: { kind: "email", hash: "email", timestamp: 0 },
      },
    ]);
    const mapped = mapRedisSnapshot([
      {
        key: "bull:george-tasks:active",
        type: "list",
        expiresAt: null,
        value: ["running"],
      },
      {
        key: "bull:george-tasks:wait",
        type: "list",
        expiresAt: null,
        value: ["pending"],
      },
    ]);
    expect(mapped.rows).toEqual([]);
    expect(mapped.discardedDiscordJobs).toBe(2);
  });
  it("translates period rankings and unstarted Bull jobs; refuses partial jobs", async () => {
    const snapshot = [
      {
        key: "oxytype:dailyleaderboard:scores:english:time:15:1000",
        type: "zset",
        expiresAt: 9999999999999,
        value: ["import-user", "100"],
      },
      {
        key: "oxytype:dailyleaderboard:results:english:time:15:1000",
        type: "hash",
        expiresAt: 9999999999999,
        value: {
          "import-user": JSON.stringify({
            uid: "import-user",
            discordId: "removed-id",
            discordAvatar: "removed-avatar",
            wpm: 80,
            acc: 100,
            timestamp: 1,
          }),
        },
      },
      {
        key: "bull:later:delayed",
        type: "zset",
        expiresAt: null,
        value: ["job", "12345"],
      },
      {
        key: "bull:later:job",
        type: "hash",
        expiresAt: null,
        value: {
          data: JSON.stringify({
            taskName: "weekly-xp-leaderboard-results",
            ctx: { lastWeekTimestamp: 1000 },
          }),
          timestamp: "1000",
          delay: "2000",
        },
      },
    ];
    const mapped = mapRedisSnapshot(snapshot);
    expect(mapped.rows.map((row) => row.table)).toEqual([
      "daily_entries",
      "scheduled_jobs",
    ]);
    expect(
      JSON.parse(mapped.rows[0]?.values["data"] as string),
    ).not.toHaveProperty("discordId");
    expect(
      JSON.parse(mapped.rows[0]?.values["data"] as string),
    ).not.toHaveProperty("discordAvatar");
    for (const row of mapped.rows) {
      await local.db.batch(rowSql(row).map((sql) => local.db.prepare(sql)));
    }
    expect(
      await local.db
        .prepare("SELECT due_at FROM scheduled_jobs WHERE id='job'")
        .first("due_at"),
    ).toBe(3000);
    expect(() =>
      mapRedisSnapshot([
        ...snapshot,
        {
          key: "bull:later:active",
          type: "list",
          expiresAt: null,
          value: ["job"],
        },
      ]),
    ).toThrow("Drain active");
  });
});
