import type { CompletedEvent } from "@oxytype/schemas/results";

import { describe, expect, test } from "bun:test";
import { join } from "node:path";

import type { AppPaths } from "../src/storage/paths";

import { openAccount, type Account } from "../src/account";
import { networkSettingsSchema } from "../src/api/settings";
import { openConfigStore, type ConfigStore } from "../src/config/store";
import { bigTextLines } from "../src/ui/big-text";
import { renderApp } from "./helpers/app";
import { finishedTest, identity, uploadResponse } from "./helpers/finished";
import { tempDir } from "./helpers/temp-dir";

const settings = networkSettingsSchema.parse({ apiUrl: identity.apiUrl });
const token = {
  access_token: "private-session-token",
  token_type: "Bearer",
  expires_in: 3600,
};
async function fixture(
  options: { poll?: Parameters<typeof openAccount>[0]["poll"] } = {},
): Promise<{
  account: Account;
  config: ConfigStore;
  paths: AppPaths;
  requests: { path: string; method: string; body?: unknown }[];
  setOnline: (online: boolean) => void;
  reopen: () => Promise<Account>;
}> {
  const root = await tempDir();
  const paths = {
    config: join(root, "config"),
    data: join(root, "data"),
    cache: join(root, "cache"),
  };
  const config = await openConfigStore(join(paths.config, "config.json"));
  const requests: { path: string; method: string; body?: unknown }[] = [];
  let online = true;
  const args: Parameters<typeof openAccount>[0] = {
    paths,
    config,
    settings,
    browser: async () => undefined,
    poll: options.poll ?? (async () => token),
    fetch: async (input, init) => {
      if (!online) throw new Error("offline");
      const path = new URL(input instanceof Request ? input.url : input)
        .pathname;
      requests.push({
        path,
        method: init?.method ?? "GET",
        ...(typeof init?.body === "string"
          ? { body: JSON.parse(init.body) as unknown }
          : {}),
      });
      if (path.endsWith("/device/code")) {
        return Response.json({
          device_code: "private-device-code",
          user_code: "ABCD-1234",
          verification_uri: "https://example.test/device",
          expires_in: 600,
          interval: 1,
        });
      }
      if (path.endsWith("/get-session")) {
        return Response.json({
          session: { expiresAt: new Date(Date.now() + 3600_000).toISOString() },
          user: { id: identity.uid, name: "Tester" },
        });
      }
      if (path.endsWith("/configs") && init?.method === "GET") {
        return Response.json({
          message: "ok",
          data: { mode: "words", words: 10 },
        });
      }
      if (path.endsWith("/results")) return Response.json(uploadResponse);
      return Response.json({ message: "ok" });
    },
  };
  return {
    paths,
    config,
    requests,
    account: await openAccount(args),
    setOnline: (value) => {
      online = value;
    },
    reopen: async () => openAccount(args),
  };
}

describe("connected account screens", () => {
  test("renders the public device code, cancels consent, then logs in and out through screen keys", async () => {
    let release!: (value: typeof token) => void;
    const client = await fixture({
      poll: async () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    });
    try {
      const app = await renderApp({
        account: client.account,
        config: client.config,
        initialScreen: "account",
      });
      app.mockInput.pressEnter();
      await app.waitForFrame((frame) => frame.includes("code ABCD-1234"));
      const frame = await app.frame();
      expect(frame).toContain("https://example.test/device");
      expect(frame).not.toContain("private-device-code");
      expect(frame).not.toContain("private-session-token");
      await app.escape();
      release(token);
      await app.waitForFrame((next) => next.includes("not logged in · guest"));
      app.mockInput.pressEnter();
      await app.waitForFrame((next) => next.includes("code ABCD-1234"));
      release(token);
      await app.waitForFrame((next) => next.includes("config synced"));
      expect(await app.frame()).toContain("Tester · authenticated");
      app.mockInput.pressKey("l");
      await app.waitForFrame((next) => next.includes("Logged out"));
      expect(
        client.requests.some((request) => request.path.endsWith("/sign-out")),
      ).toBe(true);
    } finally {
      await client.account.flush();
      client.account.stop();
      await client.config.flush();
    }
  });

  test("saves and uploads a typed test once, showing a TUI PB on results", async () => {
    const client = await fixture();
    try {
      await client.account.auth.login();
      let clock = 0;
      const words = "the quick brown fox jumps over the lazy dog again"
        .split(" ")
        .map((word, index) => word + (index === 9 ? "" : " "));
      const app = await renderApp({
        account: client.account,
        config: client.config,
        testOptions: { words, schedule: false, now: () => clock },
      });
      for (const char of words.join("")) {
        clock += 180;
        app.mockInput.pressKey(char);
        await app.renderOnce();
      }
      await app.waitForFrame((frame) => frame.includes("new TUI PB"));
      expect(
        client.requests.filter((request) => request.path.endsWith("/results")),
      ).toHaveLength(1);
      expect(client.account.queue.entries()).toHaveLength(0);
      expect(await app.frame()).toContain(bigTextLines("100%")[0]);
    } finally {
      await client.account.flush();
      client.account.stop();
      await client.config.flush();
    }
  });

  test("restores an account offline, retains queued tests and uploads only offline payloads on reconnect", async () => {
    const client = await fixture();
    let reopened: Account | undefined;
    try {
      await client.account.auth.login();
      client.setOnline(false);
      await client.account.uploads.accept(await finishedTest());
      expect(client.account.queue.entries()).toHaveLength(1);
      await client.account.flush();
      client.account.stop();
      reopened = await client.reopen();
      expect(await reopened.auth.check()).toBe(false);
      expect(reopened.auth.state()).toBe("offline");
      expect(reopened.identity()).toMatchObject({
        uid: identity.uid,
        online: false,
      });
      await reopened.uploads.accept(
        await finishedTest({ ...identity, online: false }),
      );
      expect(reopened.queue.entries()).toHaveLength(2);
      client.setOnline(true);
      expect(await reopened.auth.check()).toBe(true);
      const results = client.requests.filter((request) =>
        request.path.endsWith("/results"),
      );
      expect(results).toHaveLength(2);
      expect(
        results.every(
          (request) =>
            (request.body as { result: CompletedEvent }).result.offline ===
            true,
        ),
      ).toBe(true);
      expect(reopened.queue.entries()).toHaveLength(0);
    } finally {
      await reopened?.flush();
      reopened?.stop();
      client.account.stop();
      await client.config.flush();
    }
  });
});
