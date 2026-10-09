import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { readFile } from "node:fs/promises";

import { createAssetSource } from "../src/assets/source";
import { createTestSources } from "../src/test/sources";
import { writeJson } from "../src/storage/json";
import { tempDir } from "./helpers/temp-dir";
import { typingTest } from "./helpers/typing-test";

const french = { name: "french", words: ["bonjour", "monde"] };
const quotes = {
  language: "french",
  groups: [
    [0, 100],
    [101, 200],
    [201, 300],
    [301, 1000],
  ],
  quotes: [{ id: 1, text: "bonjour le monde", source: "test", length: 16 }],
};
describe("on-demand assets", () => {
  test("downloads a language and quotes over HTTP, then loads both on cold offline startup", async () => {
    const cacheDir = await tempDir();
    const requests: string[] = [];
    const server = Bun.serve({
      port: 0,
      fetch: (request) => {
        expect(request.headers.has("authorization")).toBe(false);
        const path = new URL(request.url).pathname;
        requests.push(path);
        return Response.json(
          path === "/version.json"
            ? { version: "one" }
            : path.startsWith("/languages/")
              ? french
              : quotes,
          { headers: { etag: '"one"' } },
        );
      },
    });
    const baseUrl = server.url.href;
    try {
      const sources = createTestSources(
        createAssetSource({ cacheDir, remote: { baseUrl, timeoutMs: 200 } }),
      );
      expect(
        (await sources.loadLanguage("french", [0])).language.words,
      ).toEqual(french.words);
      expect((await sources.quotes.getQuotes("french")).quotes[0]?.text).toBe(
        "bonjour le monde",
      );
      expect(requests).toEqual([
        "/version.json",
        "/languages/french.json",
        "/quotes/french.json",
      ]);
    } finally {
      await server.stop(true);
    }
    const offline = createTestSources(
      createAssetSource({
        cacheDir,
        remote: {
          baseUrl,
          timeoutMs: 200,
          fetch: async () => {
            throw new Error("offline");
          },
        },
      }),
    );
    expect((await offline.loadLanguage("french", [0])).language.name).toBe(
      "french",
    );
    expect((await offline.quotes.getQuotes("french")).quotes).toHaveLength(1);
  });

  test("revalidates ETags against the release version, updates stale data, and keeps a good cache on failure", async () => {
    const cacheDir = await tempDir();
    let release = "one";
    let tag = '"one"';
    let words = ["bonjour"];
    let broken = false;
    const conditional: (string | null)[] = [];
    const remote = {
      baseUrl: "https://assets.test",
      timeoutMs: 100,
      fetch: async (input: string | URL | Request, init?: RequestInit) => {
        const url = input instanceof Request ? input.url : input;
        if (new URL(url).pathname === "/version.json") {
          return Response.json({ version: release });
        }
        const previous = new Headers(init?.headers).get("if-none-match");
        conditional.push(previous);
        if (broken) return Response.json({ name: "english", words: [] });
        if (previous === tag) return new Response(null, { status: 304 });
        return Response.json({ ...french, words }, { headers: { etag: tag } });
      },
    };
    const load = async (): Promise<unknown> =>
      createAssetSource({ cacheDir, remote })("/languages/french.json");
    expect(await load()).toMatchObject({ words });
    release = "two";
    expect(await load()).toMatchObject({ words });
    words = ["salut"];
    tag = '"two"';
    expect(await load()).toMatchObject({ words });
    broken = true;
    expect(await load()).toMatchObject({ words });
    expect(conditional).toEqual([null, '"one"', '"one"', '"two"']);
    const scope = createHash("sha256")
      .update(remote.baseUrl)
      .digest("hex")
      .slice(0, 16);
    const cached = JSON.parse(
      await readFile(
        join(cacheDir, "remote", scope, "languages/french.json"),
        "utf8",
      ),
    ) as { assetVersion: string };
    expect(cached.assetVersion).toBe("two");
  });

  test("falls back without changing the preference and retries the same language after reconnect", async () => {
    let online = false;
    const sources = createTestSources(
      createAssetSource({
        cacheDir: await tempDir(),
        remote: {
          baseUrl: "https://assets.test",
          timeoutMs: 100,
          fetch: async (input) => {
            if (!online) throw new Error("offline");
            return Response.json(
              new URL(
                input instanceof Request ? input.url : input,
              ).pathname.endsWith("version.json")
                ? { version: "one" }
                : french,
            );
          },
        },
      }),
    );
    const { test: typing, store } = await typingTest({ sources });
    store.set("language", "french");
    await typing.restart();
    expect(typing.config().language).toBe("english");
    expect(typing.notice()).toContain("french is not available offline");
    expect(store.config.language).toBe("french");
    online = true;
    await typing.restart();
    expect(typing.config().language).toBe("french");
    await store.flush();
  });

  test("uses English quotes when the selected language has no cached/downloadable quotes", async () => {
    const cacheDir = await tempDir();
    await writeJson(join(cacheDir, "languages/french.json"), french);
    const { test: typing, store } = await typingTest({
      sources: createTestSources(createAssetSource({ cacheDir })),
    });
    store.set("language", "french");
    store.set("mode", "quote");
    await typing.restart();
    expect(typing.status()).toBe("ready");
    expect(typing.config().language).toBe("english");
    expect(typing.notice()).toContain("french quotes");
    expect(store.config.language).toBe("french");
    expect(store.config.mode).toBe("quote");
    await store.flush();
  });

  test("repairs corrupt caches and does not use another server's cached assets", async () => {
    const cacheDir = await tempDir();
    const scope = createHash("sha256")
      .update("https://assets.test")
      .digest("hex")
      .slice(0, 16);
    await writeJson(join(cacheDir, "remote", scope, "languages/french.json"), {
      version: 1,
      assetVersion: "old",
      data: { name: "english", words: ["wrong"] },
    });
    const first = createAssetSource({
      cacheDir,
      remote: {
        baseUrl: "https://assets.test",
        timeoutMs: 100,
        fetch: async (input) =>
          Response.json(
            new URL(
              input instanceof Request ? input.url : input,
            ).pathname.endsWith("version.json")
              ? { version: "one" }
              : french,
          ),
      },
    });
    expect(await first("/languages/french.json")).toEqual(french);
    const other = createTestSources(
      createAssetSource({
        cacheDir,
        remote: {
          baseUrl: "https://other.test",
          timeoutMs: 100,
          fetch: async () => {
            throw new Error("offline");
          },
        },
      }),
    );
    expect((await other.loadLanguage("french")).missing).toBe("french");
  });
});
