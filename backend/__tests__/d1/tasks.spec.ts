import { afterAll, beforeAll, describe, expect, it, vi } from "vite-plus/test";
import { createTestRuntime } from "./helpers";
import { withRuntime } from "../../src/runtime/env";
import { __testing, dispatch } from "../../src/runtime/tasks";
import * as UserDAL from "../../src/dal/user";
import { BASE_CONFIGURATION } from "../../src/constants/base-configuration";
import { statement } from "../../src/db/client";
import { MonkeyQueue } from "../../src/queues/monkey-queue";
import type { WorkerEnv } from "../../src/runtime/env";

describe("durable queue delivery", () => {
  let test: Awaited<ReturnType<typeof createTestRuntime>>;
  beforeAll(async () => {
    test = await createTestRuntime();
  });
  afterAll(async () => {
    await test?.dispose();
  });
  it("stores long delays durably and publishes IDs after commit", async () => {
    const sendBatch = vi.fn(async () => undefined);
    const env = {
      ...test.env,
      TASKS: { sendBatch } as unknown as WorkerEnv["TASKS"],
    };
    await withRuntime(env, async () => {
      const queue = new MonkeyQueue("george-tasks");
      await queue.add(
        "future",
        { name: "future" },
        { jobId: "long-delay", delay: 7 * 86400000 },
      );
      await queue.add(
        "immediate",
        { name: "immediate" },
        { jobId: "immediate" },
      );
      await dispatch();
      expect(sendBatch).toHaveBeenCalledWith([
        { body: { id: "immediate", kind: "outbox" } },
      ]);
      expect(
        await statement(
          "SELECT count(*) AS count FROM scheduled_jobs WHERE id='long-delay'",
        ).first<number>("count"),
      ).toBe(1);
    });
  });
  it("applies duplicate reward deliveries once", async () => {
    await withRuntime(test.env, async () => {
      await UserDAL.addUser("Recipient", "recipient@example.com", "recipient");
      const mail = {
        id: "rewardDelivery",
        timestamp: Date.now(),
        read: false,
        subject: "Reward",
        body: "Earned",
        rewards: [{ type: "xp", item: 75 }],
      };
      const data = {
        uid: "recipient",
        mail: [mail],
        inboxConfig: {
          ...BASE_CONFIGURATION.users.inbox,
          enabled: true,
          maxMail: 100,
        },
      };
      await statement(
        "INSERT INTO outbox(id,type,uid,created_at,data) VALUES('reward-delivery','reward','recipient',0,?)",
        JSON.stringify(data),
      ).run();
      await __testing.consume({ id: "reward-delivery", kind: "outbox" });
      await __testing.consume({ id: "reward-delivery", kind: "outbox" });
      expect(await UserDAL.getInbox("recipient")).toHaveLength(1);
      await UserDAL.updateInbox("recipient", [mail.id], []);
      expect((await UserDAL.getUser("recipient", "test")).xp).toBe(75);
    });
  });
  it("sends integration idempotency keys and retains failed deliveries", async () => {
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("failure", { status: 503 }))
      .mockResolvedValue(new Response("{}", { status: 200 }));
    try {
      await withRuntime(
        {
          ...test.env,
          INTEGRATION_URL: "https://bridge.example/",
          INTEGRATION_SECRET: "test-secret",
        },
        async () => {
          await expect(
            __testing.consume({ id: "immediate", kind: "outbox" }),
          ).rejects.toThrow(/503/);
          expect(
            await statement(
              "SELECT completed_at FROM outbox WHERE id='immediate'",
            ).first("completed_at"),
          ).toBeNull();
          await __testing.consume({ id: "immediate", kind: "outbox" });
          await __testing.consume({ id: "immediate", kind: "outbox" });
          expect(fetch).toHaveBeenCalledTimes(2);
          expect(fetch.mock.calls[1]?.[1]?.headers).toMatchObject({
            "idempotency-key": "immediate",
          });
        },
      );
    } finally {
      fetch.mockRestore();
    }
  });
});
