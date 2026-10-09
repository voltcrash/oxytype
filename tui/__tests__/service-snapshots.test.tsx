import { afterEach, expect, test } from "bun:test";
import { join } from "node:path";

import { openAccount, type Account } from "../src/account";
import { networkSettingsSchema } from "../src/api/settings";
import { openConfigStore, type ConfigStore } from "../src/config/store";
import { createHistoryStore } from "../src/results/history";
import { renderApp } from "./helpers/app";
import { finishedTest } from "./helpers/finished";
import { tempDir } from "./helpers/temp-dir";

const clients: { account: Account; config: ConfigStore }[] = [];
afterEach(async () => {
  for (const client of clients.splice(0)) {
    await client.account.flush();
    client.account.stop();
    await client.config.flush();
  }
});
const profile = {
  name: "Tester",
  addedAt: 0,
  streak: 2,
  maxStreak: 3,
  xp: 100,
  personalBests: { time: {}, words: {} },
  typingStats: { completedTests: 7, startedTests: 8, timeTyping: 100 },
};
async function client() {
  const root = await tempDir();
  const config = await openConfigStore(join(root, "config.json"));
  const account = await openAccount({
    paths: {
      config: root,
      cache: join(root, "cache"),
      data: join(root, "data"),
    },
    settings: networkSettingsSchema.parse({
      apiUrl: "https://example.test/api",
    }),
    config,
    browser: async () => undefined,
    poll: async () => ({
      access_token: "session",
      token_type: "Bearer",
      expires_in: 3600,
    }),
    fetch: async (input) => {
      const path = new URL(input instanceof Request ? input.url : input)
        .pathname;
      if (path.endsWith("/device/code")) {
        return Response.json({
          device_code: "private",
          user_code: "ABCD-1234",
          verification_uri: "https://example.test/device",
          expires_in: 600,
          interval: 1,
        });
      }
      if (path.endsWith("/get-session")) {
        return Response.json({
          session: { expiresAt: new Date(Date.now() + 3600_000).toISOString() },
          user: { id: "test-user", name: "Tester" },
        });
      }
      if (path.endsWith("/configs")) {
        return Response.json({ message: "ok", data: {} });
      }
      if (path.endsWith("/profile")) {
        return Response.json({ message: "ok", data: profile });
      }
      if (path.endsWith("/leaderboards")) {
        return Response.json({
          message: "ok",
          data: {
            count: 1,
            pageSize: 50,
            entries: [
              {
                name: "Tester",
                uid: "test-user",
                rank: 0,
                wpm: 100,
                raw: 101,
                acc: 100,
                timestamp: 0,
              },
            ],
          },
        });
      }
      if (path.endsWith("/rank")) {
        return Response.json({ message: "ok", data: null });
      }
      return Response.json({ message: "ok", data: [] });
    },
  });
  clients.push({ account, config });
  return { account, config };
}
const snapshot = (frame: string): string =>
  frame
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n");
const size = { width: 80, height: 24 };

test("guest and authenticated account snapshots", async () => {
  const service = await client();
  const app = await renderApp(
    {
      ...service,
      initialScreen: "account",
      testOptions: { words: ["cat ", "dog"], schedule: false },
    },
    size,
  );
  expect(snapshot(await app.frame())).toMatchSnapshot("guest account");
  await service.account.auth.login();
  await app.waitForFrame((frame) => frame.includes("100 xp"));
  expect(snapshot(await app.frame())).toMatchSnapshot("authenticated account");
});

test("populated leaderboard snapshot", async () => {
  const service = await client();
  const app = await renderApp(
    {
      ...service,
      initialScreen: "leaderboards",
      testOptions: { words: ["cat ", "dog"], schedule: false },
    },
    size,
  );
  await app.waitForFrame((frame) => frame.includes("100 wpm"));
  expect(snapshot(await app.frame())).toMatchSnapshot("leaderboard");
});

test("saved history detail snapshot", async () => {
  const finished = await finishedTest();
  const history = createHistoryStore([
    {
      id: "00000000-0000-4000-8000-000000000000",
      result: finished.result,
      rawHistory: finished.rawHistory,
    },
  ]);
  const app = await renderApp(
    {
      initialScreen: "history",
      history,
      testOptions: { words: ["cat ", "dog"], schedule: false },
    },
    size,
  );
  app.mockInput.pressEnter();
  await app.waitForFrame((frame) => frame.includes("consistency"));
  expect(snapshot(await app.frame())).toMatchSnapshot("history details");
});
