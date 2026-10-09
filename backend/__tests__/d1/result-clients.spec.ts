import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";
import { createTestRuntime, seedUser } from "./helpers";
import { withRuntime } from "../../src/runtime/env";
import * as Results from "../../src/dal/result";
import { buildDbResult } from "../../src/utils/result";
import { completedEvent } from "../__testData__/completed-event";
import { CompletedEventSchema } from "@oxytype/schemas/results";

describe("result client partitions", () => {
  let test: Awaited<ReturnType<typeof createTestRuntime>>;
  beforeAll(async () => {
    test = await createTestRuntime({
      beforeMigration: async (db, file) => {
        if (file !== "0009_result_client.sql") return;
        await db
          .prepare(
            "INSERT INTO users(uid,id,name,name_key,email,added_at,data) VALUES('legacy','legacy','legacy','legacy','legacy@example.test',0,'{}')",
          )
          .run();
        await db
          .prepare(
            "INSERT INTO results(id,uid,timestamp,mode,mode2,language,wpm,acc,data) VALUES('legacy-result','legacy',1000,'time','30','english',80,95,'{}')",
          )
          .run();
      },
    });
    await seedUser(test.env, "client-history");
  });
  afterAll(async () => await test?.dispose());
  it("backfills legacy results and defaults omitted clients to web", async () => {
    const { client: _client, ...legacy } = completedEvent();
    expect(CompletedEventSchema.parse(legacy).client).toBe("web");
    expect(
      CompletedEventSchema.safeParse({ ...legacy, client: "unknown" }).success,
    ).toBe(false);
    expect(
      await test.env.DB.prepare(
        "SELECT client FROM results WHERE id='legacy-result'",
      ).first("client"),
    ).toBe("web");
    await withRuntime(test.env, async () => {
      expect((await Results.getResult("legacy", "legacy-result")).client).toBe(
        "web",
      );
    });
  });
  it("filters before pagination and separates last result timestamps", async () => {
    await withRuntime(test.env, async () => {
      for (const [client, timestamp] of [
        ["web", 2000],
        ["tui", 3000],
        ["web", 4000],
        ["tui", 5000],
      ] as const) {
        await Results.addResult(
          "client-history",
          buildDbResult(
            completedEvent({ uid: "client-history", client, timestamp }),
            "history",
            false,
          ),
        );
      }
      expect(
        (await Results.getResults("client-history")).map((r) => r.timestamp),
      ).toEqual([4000, 2000]);
      expect(
        (
          await Results.getResults("client-history", {
            client: "tui",
            limit: 1,
            offset: 1,
          })
        ).map((r) => r.timestamp),
      ).toEqual([3000]);
      expect(
        (await Results.getLastResult("client-history", "tui")).timestamp,
      ).toBe(5000);
      expect(await Results.getLastResultTimestamp("client-history")).toBe(4000);
      expect(
        await Results.getResults("client-history", {
          client: "tui",
          onOrAfterTimestamp: 4000,
        }),
      ).toHaveLength(1);
    });
  });
});
