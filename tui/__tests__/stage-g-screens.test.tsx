import { afterEach, describe, expect, test } from "bun:test";
import { join } from "node:path";

import { openAccount, type Account } from "../src/account";
import { networkSettingsSchema } from "../src/api/settings";
import { openConfigStore, type ConfigStore } from "../src/config/store";
import { createTextLibrary } from "../src/storage/texts";
import { renderApp } from "./helpers/app";
import { tempDir } from "./helpers/temp-dir";

const clients: { account: Account; config: ConfigStore }[] = [];
afterEach(async () => {
  for (const client of clients.splice(0)) {
    client.account.stop();
    await client.account.flush();
    await client.config.flush();
  }
});
async function server(
  handle: (url: URL, init?: RequestInit) => Response | undefined,
) {
  const root = await tempDir();
  const config = await openConfigStore(join(root, "config.json"));
  const requests: URL[] = [];
  const account = await openAccount({
    paths: {
      config: root,
      cache: join(root, "cache"),
      data: join(root, "data"),
    },
    config,
    settings: networkSettingsSchema.parse({
      apiUrl: "https://example.test/api",
    }),
    browser: async () => undefined,
    poll: async () => ({
      access_token: "session",
      token_type: "Bearer",
      expires_in: 3600,
    }),
    fetch: async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : input);
      requests.push(url);
      if (url.pathname.endsWith("/device/code")) {
        return Response.json({
          device_code: "device",
          user_code: "ABCD-1234",
          verification_uri: "https://example.test/device",
          expires_in: 600,
          interval: 1,
        });
      }
      if (url.pathname.endsWith("/get-session")) {
        return Response.json({
          session: { expiresAt: new Date(Date.now() + 3600_000).toISOString() },
          user: { id: "test-user", name: "Tester" },
        });
      }
      if (url.pathname.endsWith("/configs")) {
        return Response.json({ message: "ok", data: {} });
      }
      return (
        handle(url, init) ??
        Response.json({ message: "unexpected endpoint" }, { status: 500 })
      );
    },
  });
  const client = { account, config, requests };
  clients.push(client);
  return client;
}
const data = (value: unknown) => Response.json({ message: "ok", data: value });
const query = (url: URL, key: string): unknown => {
  const value = url.searchParams.get(key);
  try {
    return JSON.parse(value ?? "null") as unknown;
  } catch {
    return value;
  }
};
const profile = {
  name: "Tester",
  addedAt: 0,
  streak: 2,
  maxStreak: 3,
  personalBests: { time: {}, words: {} },
  typingStats: { completedTests: 7, startedTests: 8 },
};

describe("Stage G screens", () => {
  test("switches account stats between TUI and web through public profile requests", async () => {
    const client = await server((url) =>
      url.pathname.endsWith("/profile")
        ? data({ ...profile, xp: query(url, "client") === "tui" ? 100 : 200 })
        : undefined,
    );
    await client.account.auth.login();
    const app = await renderApp({ ...client, initialScreen: "account" });
    await app.waitForFrame((frame) => frame.includes("100 xp"));
    app.mockInput.pressTab();
    await app.waitForFrame((frame) => frame.includes("200 xp"));
    expect([
      ...new Set(
        client.requests
          .filter((url) => url.pathname.endsWith("/profile"))
          .map((url) => query(url, "client")),
      ),
    ]).toEqual(["tui", "web"]);
    app.mockInput.pressKey("t", { ctrl: true });
    expect(await app.frame()).toContain("^r restart");
  });
  test("paginates zero-based boards and opens the selected public profile", async () => {
    const client = await server((url) => {
      if (url.pathname.endsWith("/profile")) return data(profile);
      if (url.pathname.endsWith("/leaderboards")) {
        const page = Number(query(url, "page"));
        return data({
          count: 51,
          pageSize: 50,
          entries: [
            {
              name: "Tester",
              uid: "test-user",
              rank: page * 50,
              wpm: 100,
              raw: 101,
              acc: 100,
              timestamp: 0,
            },
          ],
        });
      }
      return undefined;
    });
    const app = await renderApp({ ...client, initialScreen: "leaderboards" });
    await app.waitForFrame((frame) => frame.includes("page 1/2"));
    app.mockInput.pressArrow("right");
    await app.waitForFrame(
      (frame) => frame.includes("page 2/2") && frame.includes("51."),
    );
    expect(
      client.requests
        .filter((url) => url.pathname.endsWith("/leaderboards"))
        .map((url) => query(url, "page")),
    ).toEqual([0, 1]);
    app.mockInput.pressEnter();
    await app.waitForFrame((frame) => frame.includes("profile · Tester"));
  });
  test("adds and activates a tag, then renames it through the palette", async () => {
    let tags = [
      {
        _id: "123456789012345678901234",
        name: "initial",
        personalBests: { time: {}, words: {}, quote: {}, custom: {}, zen: {} },
      },
    ];
    const client = await server((url, init) => {
      if (!url.pathname.endsWith("/tags")) return undefined;
      const body =
        typeof init?.body === "string"
          ? (JSON.parse(init.body) as { tagName?: string; newName?: string })
          : {};
      if (init?.method === "POST") {
        const tag = {
          _id: "234567890123456789012345",
          name: body.tagName ?? "",
          personalBests: {
            time: {},
            words: {},
            quote: {},
            custom: {},
            zen: {},
          },
        };
        tags.push(tag);
        return data(tag);
      }
      if (init?.method === "PATCH") {
        tags = tags.map((tag, index) =>
          index === 0 ? { ...tag, name: body.newName ?? "" } : tag,
        );
        return Response.json({ message: "ok" });
      }
      return data(tags);
    });
    await client.account.auth.login();
    const app = await renderApp({ ...client, initialScreen: "tags" });
    await app.waitForFrame((frame) => frame.includes("initial"));
    app.mockInput.pressKey(" ");
    expect(client.account.tags.active()).toEqual([tags[0]?._id ?? ""]);
    app.mockInput.pressKey("a");
    await app.mockInput.typeText("new-tag");
    app.mockInput.pressEnter();
    await app.waitForFrame((frame) => frame.includes("new-tag"));
    app.mockInput.pressKey("e");
    app.mockInput.pressKey("u", { ctrl: true });
    await app.mockInput.typeText("renamed");
    app.mockInput.pressEnter();
    await app.waitForFrame((frame) => frame.includes("renamed"));
    app.mockInput.pressKey("a", { ctrl: true });
    expect(await app.active("account")).toBe(true);
  });
  test("saves bracketed multiline paste, then pastes a browser handoff command", async () => {
    const library = createTextLibrary();
    const app = await renderApp({
      initialScreen: "custom",
      testOptions: { texts: library },
    });
    app.mockInput.pressKey("n");
    await app.mockInput.pasteBracketedText("first\r\nsecond\tline");
    await app.escape();
    app.mockInput.pressKey("s");
    await app.mockInput.typeText("pasted");
    app.mockInput.pressEnter();
    await app.renderOnce();
    await app.waitForFrame((frame) => frame.includes("pasted"));
    expect(library.texts()[0]?.settings.text).toEqual(["first\nsecond\tline"]);
    app.mockInput.pressKey("s", { ctrl: true });
    expect(await app.active("settings")).toBe(true);
    app.mockInput.pressKey("p", { ctrl: true });
    await app.mockInput.pasteBracketedText("Sign up in browser");
    app.mockInput.pressEnter();
    await app.waitForFrame((frame) =>
      frame.includes("https://oxytype.voltcrash.com/login"),
    );
  });
  test("replays completed input with seek and speed controls without saving again", async () => {
    const config = await openConfigStore(join(await tempDir(), "config.json"));
    config.set("mode", "words");
    config.set("words", 2);
    let now = 0;
    const app = await renderApp({
      config,
      testOptions: { words: ["cat ", "dog"], now: () => now, schedule: false },
    });
    for (const char of "cat dog") {
      now += 500;
      app.mockInput.pressKey(char);
      await app.renderOnce();
    }
    await app.waitForFrame((frame) => frame.includes("enter next test"));
    app.mockInput.pressKey("r");
    expect(await app.frame()).toContain("last test replay · paused · 1×");
    app.mockInput.pressKey("END");
    expect(await app.frame()).toContain("3.0 / 3.0s");
    app.mockInput.pressKey("s");
    expect(await app.frame()).toContain("paused · 2×");
    app.mockInput.pressArrow("left");
    expect(await app.frame()).toContain("2.0 / 3.0s");
    app.mockInput.pressKey("s", { ctrl: true });
    expect(await app.active("settings")).toBe(true);
    await config.flush();
  });
  test("loads public announcements with a retry after a server error", async () => {
    let offline = true;
    const client = await server((url) =>
      url.pathname.endsWith("/psas")
        ? offline
          ? Response.json(
              { message: "maintenance", errorId: "maintenance" },
              { status: 503 },
            )
          : data([
              {
                _id: "123",
                sticky: true,
                level: -1,
                message: "Scheduled maintenance",
              },
            ])
        : undefined,
    );
    const app = await renderApp({ ...client, initialScreen: "announcements" });
    await app.waitForFrame((frame) => frame.includes("maintenance"));
    offline = false;
    app.mockInput.pressKey("r");
    await app.waitForFrame((frame) => frame.includes("Scheduled maintenance"));
  });
});
