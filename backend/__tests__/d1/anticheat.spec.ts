import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";
import objectHash from "object-hash";
import type { ExecutionContext } from "@cloudflare/workers-types";
import type { CompletedEvent } from "@oxytype/schemas/results";
import { createTestRuntime } from "./helpers";
import { withRuntime } from "../../src/runtime/env";
import { getAuth } from "../../src/init/auth";
import { patchConfiguration } from "../../src/init/configuration";
import * as Users from "../../src/dal/user";
import * as Public from "../../src/dal/public";
import { mutateUser } from "../../src/db/mutation";
import Worker from "../../src/worker";
import { completedEvent } from "../__testData__/completed-event";

describe("production anticheat with D1", () => {
  let test: Awaited<ReturnType<typeof createTestRuntime>>;
  let index = 0;
  const execution = {
    waitUntil: () => undefined,
  } as unknown as ExecutionContext;
  beforeAll(async () => {
    test = await createTestRuntime();
    test.env.MODE = "production";
    test.env.BETTER_AUTH_URL = "http://localhost:5005/api/auth";
    test.env.BETTER_AUTH_SECRET =
      "anticheat-test-secret-at-least-thirty-two-characters";
    await withRuntime(test.env, async () => {
      await patchConfiguration({
        results: { savingEnabled: true, objectHashCheckEnabled: true },
        users: { inbox: { enabled: true, maxMail: 10 } },
      });
    });
  });
  afterAll(async () => await test?.dispose());

  async function account(
    ageSeconds = 300,
  ): Promise<{ uid: string; token: string }> {
    return await withRuntime(test.env, async () => {
      const auth = await getAuth().$context;
      const user = await auth.internalAdapter.createUser(
        {
          name: `Typing${index}`,
          email: `typing${index++}@example.com`,
          emailVerified: true,
        },
        { method: "oauth", oauth: { providerId: "github" } },
      );
      await Users.addUser(user.name, user.email, user.id);
      const createdAt = Date.now() - ageSeconds * 1000;
      await test.env.DB.prepare(
        "UPDATE users SET added_at=?,data=json_set(data,'$.addedAt',?) WHERE uid=?",
      )
        .bind(createdAt, createdAt, user.id)
        .run();
      const session = await auth.internalAdapter.createSession(user.id, false);
      if (session === null) throw new Error("Missing session");
      return { uid: user.id, token: session.token };
    });
  }
  async function submit(
    user: { uid: string; token: string },
    changes: Partial<CompletedEvent> = {},
    path = "/api/results",
  ): Promise<Response> {
    const { hash: _hash, ...result } = completedEvent({
      ...changes,
      uid: user.uid,
    });
    return await Worker.fetch(
      new Request(`http://localhost:5005${path}`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${user.token}`,
          origin: "http://localhost:3000",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          result: { ...result, hash: objectHash(result) },
        }),
      }),
      test.env,
      execution,
    );
  }
  async function assertNoProgress(uid: string): Promise<void> {
    await withRuntime(test.env, async () => {
      const user = await Users.getUser(uid, "anticheat test");
      expect(user.xp ?? 0).toBe(0);
      expect(user.completedTests ?? 0).toBe(0);
      expect(user.timeTyping ?? 0).toBe(0);
      expect(user.personalBests.time).toEqual({});
      expect(
        await test.env.DB.prepare(
          "SELECT count(*) AS count FROM results WHERE uid=?",
        )
          .bind(uid)
          .first("count"),
      ).toBe(0);
      expect(
        await test.env.DB.prepare(
          "SELECT count(*) AS count FROM daily_entries WHERE uid=?",
        )
          .bind(uid)
          .first("count"),
      ).toBe(0);
      expect(
        await test.env.DB.prepare(
          "SELECT count(*) AS count FROM weekly_entries WHERE uid=?",
        )
          .bind(uid)
          .first("count"),
      ).toBe(0);
    });
  }
  function fixedResult(): Partial<CompletedEvent> {
    return {
      wpm: 160,
      rawWpm: 160,
      acc: 100,
      charStats: [400, 0, 0, 0],
      charTotal: 400,
      keySpacing: Array.from({ length: 399 }, () => 75),
      keyDuration: Array.from({ length: 400 }, () => 25),
      keyConsistency: 100,
      lastKeyToEnd: 75,
      keyOverlap: 0,
    };
  }

  it("saves valid production results without a bypass and updates progression", async () => {
    const user = await account();
    const response = await submit(user);
    expect(response.status, await response.clone().text()).toBe(200);
    await withRuntime(test.env, async () => {
      const profile = await Users.getUser(user.uid, "test");
      expect(profile.completedTests).toBe(1);
      expect(profile.timeTyping).toBe(30);
      expect(profile.xp).toBeGreaterThan(0);
      expect(
        await test.env.DB.prepare(
          "SELECT count(*) AS count FROM results WHERE uid=?",
        )
          .bind(user.uid)
          .first("count"),
      ).toBe(1);
    });
  });
  it("bounds first-result duration to server account age, ignoring the client timestamp", async () => {
    const user = await account(0);
    expect((await submit(user, { timestamp: 1 })).status).toBe(462);
    await assertNoProgress(user.uid);
    expect(
      await test.env.DB.prepare(
        "SELECT count(*) AS count FROM audit_logs WHERE uid=? AND event='invalid_result_spacing'",
      )
        .bind(user.uid)
        .first("count"),
    ).toBe(1);
  });
  it.each(["/api/results", "/results"])(
    "rejects forged scores at %s without saving progression, even with the old bypass binding",
    async (path) => {
      Object.assign(test.env, { BYPASS_ANTICHEAT: "true" });
      const user = await account();
      expect((await submit(user, { wpm: 120 }, path)).status).toBe(463);
      await assertNoProgress(user.uid);
      expect(
        await test.env.DB.prepare(
          "SELECT count(*) AS count FROM audit_logs WHERE uid=? AND event='anticheat_rejected'",
        )
          .bind(user.uid)
          .first("count"),
      ).toBe(1);
    },
  );
  it("rejects falsified timelines, restart credit and short-test sentinels", async () => {
    for (const changes of [
      { lastKeyToEnd: 0 },
      { incompleteTestSeconds: 500 },
      { chartData: "toolong" },
    ] satisfies Partial<CompletedEvent>[]) {
      const user = await account();
      expect((await submit(user, changes)).status).toBe(463);
      await assertNoProgress(user.uid);
    }
  });
  it("reports missing high-speed telemetry without adding a ban strike", async () => {
    const user = await account();
    expect(
      (
        await submit(user, {
          ...fixedResult(),
          keySpacing: [],
          keyDuration: [],
          keyConsistency: 0,
        })
      ).status,
    ).toBe(464);
    await assertNoProgress(user.uid);
    await withRuntime(test.env, async () =>
      expect(
        (await Users.getUser(user.uid, "test")).autoBanTimestamps,
      ).toBeUndefined(),
    );
  });
  it("rejects fixed-timing bots without banning by default", async () => {
    const user = await account();
    expect((await submit(user, fixedResult())).status).toBe(465);
    await assertNoProgress(user.uid);
    await withRuntime(test.env, async () =>
      expect((await Users.getUser(user.uid, "test")).banned).not.toBe(true),
    );
  });
  it("commits configured strikes and a ban/inbox message despite rejecting the result", async () => {
    const user = await account();
    await withRuntime(
      test.env,
      async () =>
        await patchConfiguration({
          users: { autoBan: { enabled: true, maxCount: 1, maxHours: 1 } },
        }),
    );
    try {
      expect((await submit(user, fixedResult())).status).toBe(465);
      await withRuntime(test.env, async () => {
        const profile = await Users.getUser(user.uid, "test");
        expect(profile.autoBanTimestamps).toHaveLength(1);
        expect(profile.banned).not.toBe(true);
      });
      expect((await submit(user, fixedResult())).status).toBe(465);
      await withRuntime(test.env, async () => {
        const profile = await Users.getUser(user.uid, "test");
        expect(profile.autoBanTimestamps).toHaveLength(2);
        expect(profile.banned).toBe(true);
        expect(profile.inbox).toHaveLength(1);
      });
      await assertNoProgress(user.uid);
      expect(
        await test.env.DB.prepare(
          "SELECT count(*) AS count FROM audit_logs WHERE uid=? AND event='anticheat_rejected'",
        )
          .bind(user.uid)
          .first("count"),
      ).toBe(2);
    } finally {
      await withRuntime(
        test.env,
        async () =>
          await patchConfiguration({ users: { autoBan: { enabled: false } } }),
      );
    }
  });
  it("serializes concurrent strikes, expires old strikes, and leaves public stats unchanged", async () => {
    const user = await account();
    const before = await withRuntime(test.env, async () => {
      await patchConfiguration({
        users: { autoBan: { enabled: true, maxCount: 1, maxHours: 1 } },
      });
      await mutateUser(user.uid, (profile) => {
        profile.autoBanTimestamps = [Date.now() - 2 * 3600_000];
      });
      return await Public.getTypingStats();
    });
    try {
      const responses = await Promise.all([
        submit(user, fixedResult()),
        submit(user, fixedResult()),
      ]);
      expect(responses.map((response) => response.status)).toEqual([465, 465]);
      await withRuntime(test.env, async () => {
        const profile = await Users.getUser(user.uid, "test");
        expect(profile.autoBanTimestamps).toHaveLength(2);
        expect(profile.banned).toBe(true);
        expect(profile.inbox).toHaveLength(1);
        expect(await Public.getTypingStats()).toEqual(before);
      });
      expect(
        await test.env.DB.prepare(
          "SELECT count(*) AS count FROM audit_logs WHERE uid=? AND event='anticheat_rejected'",
        )
          .bind(user.uid)
          .first("count"),
      ).toBe(2);
      await assertNoProgress(user.uid);
    } finally {
      await withRuntime(
        test.env,
        async () =>
          await patchConfiguration({ users: { autoBan: { enabled: false } } }),
      );
    }
  });
  it.each(["verified", "lbOptOut"] as const)(
    "preserves the existing %s exemption for bot heuristics, but still checks scores",
    async (flag) => {
      const user = await account();
      await withRuntime(
        test.env,
        async () =>
          await mutateUser(user.uid, (profile) => {
            profile[flag] = true;
          }),
      );
      expect((await submit(user, { wpm: 120 })).status).toBe(463);
      expect((await submit(user, fixedResult())).status).toBe(200);
    },
  );
  it("keeps long tests and IME results saveable", async () => {
    for (const changes of [
      { keySpacing: [], keyDuration: [], keyConsistency: 0 },
      {
        mode2: "180",
        testDuration: 180,
        wpm: 13.33,
        rawWpm: 14.67,
        chartData: "toolong",
        keySpacing: "toolong",
        keyDuration: "toolong",
      },
    ] satisfies Partial<CompletedEvent>[]) {
      const user = await account();
      const response = await submit(user, changes);
      expect(response.status, await response.clone().text()).toBe(200);
    }
  });
});
