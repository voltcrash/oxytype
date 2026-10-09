import { describe, expect, test } from "bun:test";
import { join } from "node:path";

import { createApi } from "../src/api/client";
import { networkSettingsSchema } from "../src/api/settings";
import { openConfigStore } from "../src/config/store";
import { createConfigSync } from "../src/config/sync";
import { identity } from "./helpers/finished";
import { tempDir } from "./helpers/temp-dir";

const settings = networkSettingsSchema.parse({ apiUrl: identity.apiUrl });
describe("account config sync", () => {
  test("server wins on login, persists the snapshot, and does not echo the pull", async () => {
    const file = join(await tempDir(), "config.json");
    const store = await openConfigStore(file);
    store.set("theme", "nord");
    store.set("words", 100);
    const methods: string[] = [];
    const api = createApi({
      settings,
      fetch: async (_input, init) => {
        methods.push(init?.method ?? "GET");
        return Response.json({
          message: "ok",
          data: {
            theme: "serika",
            language: "french",
            mode: "words",
            words: 25,
          },
        });
      },
    });
    const sync = createConfigSync({
      api,
      store,
      identity: () => identity,
      delayMs: 1,
    });
    try {
      expect(await sync.login()).toBe(true);
      await sync.flush();
      expect(store.config).toMatchObject({
        theme: "serika",
        language: "french",
        words: 25,
      });
      expect((await openConfigStore(file)).config.words).toBe(25);
      expect(methods).toEqual(["GET"]);
    } finally {
      sync.dispose();
      await store.flush();
    }
  });

  test("debounces only changed settings and preserves later edits during an in-flight PATCH", async () => {
    const store = await openConfigStore(join(await tempDir(), "config.json"));
    const patches: unknown[] = [];
    let release!: () => void;
    let blocked = false;
    const api = createApi({
      settings,
      fetch: async (_input, init) => {
        if (init?.method !== "PATCH") {
          return Response.json({ message: "ok", data: null });
        }
        patches.push(
          JSON.parse(typeof init.body === "string" ? init.body : "") as unknown,
        );
        if (blocked) {
          await new Promise<void>((resolve) => {
            release = resolve;
          });
        }
        return Response.json({ message: "saved" });
      },
    });
    const sync = createConfigSync({
      api,
      store,
      identity: () => identity,
      delayMs: 10_000,
    });
    try {
      await sync.login();
      store.set("time", 60);
      store.set("theme", "nord");
      blocked = true;
      const first = sync.retry();
      while (patches.length === 0) await Bun.sleep(1);
      store.set("time", 120);
      blocked = false;
      release();
      await first;
      await sync.flush();
      expect(patches).toEqual([{ time: 60, theme: "nord" }, { time: 120 }]);
      expect(sync.state()).toBe("synced");
    } finally {
      sync.dispose();
      await store.flush();
    }
  });

  test("retries offline edits for their original account and resets pending conflicts at login", async () => {
    const store = await openConfigStore(join(await tempDir(), "config.json"));
    let online = true;
    let current = { ...identity };
    const patches: unknown[] = [];
    const api = createApi({
      settings,
      fetch: async (_input, init) => {
        if (!online) throw new Error("offline");
        if (init?.method === "PATCH") {
          patches.push(
            JSON.parse(
              typeof init.body === "string" ? init.body : "",
            ) as unknown,
          );
          return Response.json({ message: "saved" });
        }
        return Response.json({ message: "ok", data: { time: 30 } });
      },
    });
    const sync = createConfigSync({
      api,
      store,
      identity: () => current,
      delayMs: 10_000,
    });
    try {
      await sync.login();
      online = false;
      store.set("time", 60);
      await sync.retry();
      expect(sync.notice()).toContain("failed");
      online = true;
      current = { ...identity, uid: "another-user" };
      await sync.retry();
      expect(patches).toHaveLength(0);
      current = identity;
      await sync.retry();
      expect(patches).toEqual([{ time: 60 }]);
      store.set("time", 120);
      await sync.login();
      await sync.flush();
      expect(store.config.time).toBe(30);
      expect(patches).toHaveLength(1);
    } finally {
      sync.dispose();
      await store.flush();
    }
  });

  test("failed downloads keep the local config and never push it before server reconciliation", async () => {
    const store = await openConfigStore(join(await tempDir(), "config.json"));
    store.set("time", 120);
    let requests = 0;
    const api = createApi({
      settings,
      fetch: async () => {
        requests++;
        return Response.json({ message: "busy" }, { status: 503 });
      },
    });
    const sync = createConfigSync({
      api,
      store,
      identity: () => identity,
      delayMs: 10_000,
    });
    try {
      expect(await sync.login()).toBe(false);
      store.set("time", 60);
      await sync.flush();
      expect(store.config.time).toBe(60);
      expect(requests).toBe(1);
    } finally {
      sync.dispose();
      await store.flush();
    }
  });
});
