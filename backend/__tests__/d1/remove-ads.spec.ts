import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, it } from "vite-plus/test";
import { createTestRuntime } from "./helpers";

it("removes legacy ad settings and groups while preserving supported data", async () => {
  const modes = ["off", "result", "on", "sellout"];
  const presets = [
    {
      id: "full",
      input: { name: "Full", config: { ads: "on", theme: "nord" } },
      expected: { name: "Full", config: { theme: "nord" } },
    },
    {
      id: "partial",
      input: {
        name: "Partial",
        settingGroups: ["theme", "ads", "behavior"],
        config: { ads: "off", enableAds: true, theme: "nord", tags: ["tag"] },
      },
      expected: {
        name: "Partial",
        settingGroups: ["theme", "behavior"],
        config: { theme: "nord", tags: ["tag"] },
      },
    },
    {
      id: "null",
      input: {
        name: "Nullable",
        settingGroups: null,
        config: { ads: null, enableAds: false, time: 60 },
      },
      expected: { name: "Nullable", settingGroups: null, config: { time: 60 } },
    },
    {
      id: "unchanged",
      input: {
        name: "Unchanged",
        settingGroups: ["test"],
        config: { time: 30 },
      },
      expected: {
        name: "Unchanged",
        settingGroups: ["test"],
        config: { time: 30 },
      },
    },
  ];
  const test = await createTestRuntime({
    beforeMigration: async (db, file) => {
      if (file !== "0004_remove_ads.sql") return;
      await db.batch(
        modes.flatMap((ads) => [
          db
            .prepare(
              "INSERT INTO users(uid,id,name,name_key,email,added_at,data) VALUES(?,?,?,?,?,0,'{}')",
            )
            .bind(ads, ads, ads, ads, `${ads}@example.com`),
          db
            .prepare("INSERT INTO configs(uid,id,data) VALUES(?,?,?)")
            .bind(
              ads,
              `config-${ads}`,
              JSON.stringify({ ads, enableAds: true, theme: "nord", time: 60 }),
            ),
        ]),
      );
      await db.batch([
        ...presets.map(({ id, input }) =>
          db
            .prepare(
              "INSERT INTO presets(uid,id,timestamp,data) VALUES(?,?,?,?)",
            )
            .bind("off", id, 123, JSON.stringify(input)),
        ),
        db
          .prepare("INSERT INTO presets(uid,id,timestamp,data) VALUES(?,?,?,?)")
          .bind(
            "off",
            "ads-only",
            123,
            JSON.stringify({
              name: "Ads only",
              settingGroups: ["ads"],
              config: { ads: "sellout" },
            }),
          ),
      ]);
    },
  });

  try {
    const verify = async (): Promise<void> => {
      const configs = await test.env.DB.prepare(
        "SELECT uid,id,data FROM configs ORDER BY uid",
      ).all<{ uid: string; id: string; data: string }>();
      expect(configs.results).toHaveLength(modes.length);
      for (const row of configs.results) {
        expect(row.id).toBe(`config-${row.uid}`);
        expect(JSON.parse(row.data)).toEqual({ theme: "nord", time: 60 });
      }

      const rows = await test.env.DB.prepare(
        "SELECT uid,id,timestamp,data FROM presets",
      ).all<{ uid: string; id: string; timestamp: number; data: string }>();
      expect(rows.results).toHaveLength(presets.length);
      for (const { id, expected } of presets) {
        const row = rows.results.find((preset) => preset.id === id);
        expect(row).toMatchObject({ uid: "off", timestamp: 123 });
        expect(JSON.parse(row?.data ?? "null")).toEqual(expected);
      }
      expect(
        (await test.env.DB.prepare("PRAGMA foreign_key_check").all()).results,
      ).toHaveLength(0);
    };

    await verify();
    const migration = await readFile(
      resolve(__dirname, "../../migrations/0004_remove_ads.sql"),
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
