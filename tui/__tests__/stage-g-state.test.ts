import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { createRoot, createSignal } from "solid-js";
import { getDefaultConfig } from "@oxytype/typing-core/config/default-config";
import { getChallenges } from "@oxytype/challenges";
import { openQuoteFavorites } from "../src/results/favorites";
import { createApi } from "../src/api/client";
import { networkSettingsSchema } from "../src/api/settings";
import { openTextLibrary } from "../src/storage/texts";
import { openActiveTags } from "../src/results/tags";
import { createRemote } from "../src/ui/remote";
import { createTextField } from "../src/ui/text-field";
import { announcementLines } from "../src/ui/announcement-text";
import { presetSnapshot } from "../src/config/presets";
import { hideWord } from "../src/test/visibility";
import { inputAction } from "../src/test/input";
import { createRouter } from "../src/router/router";
import { createPalette } from "../src/palette/palette";
import { key, typingTest } from "./helpers/typing-test";
import { tempDir } from "./helpers/temp-dir";
import { finishedTest } from "./helpers/finished";
import { matchesFilters, historyFiltersSchema } from "../src/results/filters";

describe("Stage G state", () => {
  test("quote search selects an exact quote and word funboxes alter generated prompts", async () => {
    const { test: typing, store } = await typingTest();
    const collection = await typing.sources.quotes.getQuotes(
      "english",
      [0, 1, 2, 3],
    );
    const quote = collection.quotes[1];
    if (quote === undefined) throw new Error("Missing quote fixture");
    await typing.selectQuote("english", quote.id);
    expect(typing.config().mode).toBe("quote");
    expect(typing.words().join("").trim()).toBe(quote.text.trim());
    store.set("mode", "words");
    store.set("funbox", ["ALL_CAPS"]);
    await typing.restart();
    expect(typing.config().funbox).toEqual(["ALL_CAPS"]);
    expect(typing.words().every((word) => word === word.toUpperCase())).toBe(
      true,
    );
    store.set("funbox", ["tts"]);
    await typing.restart();
    expect(typing.config().funbox).toEqual([]);
    expect(typing.notice()).toContain("Browser-only funboxes skipped");
    await store.flush();
  });
  test("persists quote favorites per account and removes a favorite", async () => {
    const file = join(await tempDir(), "favorites.json");
    let owner: string | undefined = "server|alice";
    const api = createApi({
      settings: networkSettingsSchema.parse({
        apiUrl: "https://example.test/api",
      }),
      fetch: async (_, init) =>
        Response.json(
          init?.method === "GET"
            ? { message: "ok", data: { english: ["42"] } }
            : { message: "ok" },
        ),
    });
    const favorites = await openQuoteFavorites(file, api, () => owner);
    await favorites.reload();
    expect(favorites.get().english).toEqual(["42"]);
    await favorites.toggle("english", 42);
    expect(favorites.get().english).toEqual([]);
    owner = "server|bob";
    expect(favorites.get()).toEqual({});
    await favorites.toggle("english", 1);
    await favorites.flush();
    const reopened = await openQuoteFavorites(file, api, () => owner);
    expect(reopened.get().english).toEqual(["1"]);
    owner = "server|alice";
    expect(reopened.get().english).toEqual([]);
    owner = undefined;
    expect(reopened.get()).toEqual({});
  });
  test("practice pairs use saved target words and preserve text and weak-spot learning", async () => {
    const { test: typing, store } = await typingTest({
      words: ["the ", "cat ", "dog"],
    });
    store.set("mode", "words");
    store.set("words", 3);
    await typing.restart();
    const original = structuredClone(typing.customText);
    const learner = typing.session().weakSpot;
    await typing.insert("the cax dog", 1000);
    expect(typing.status()).toBe("finished");
    await typing.practiceWords("biwords", false);
    expect(typing.customText.text).toContain("the cat");
    expect(typing.config().mode).toBe("custom");
    expect(store.config.mode).toBe("words");
    expect(typing.texts.current()).toEqual(original);
    expect(typing.session().weakSpot).toBe(learner);
    typing.clearChallenge();
    await typing.restart();
    expect(typing.customText).toEqual(original);
    await store.flush();
  });
  test("challenge setup is temporary and font-dependent challenges are rejected", async () => {
    const { test: typing, store } = await typingTest();
    const challenge = getChallenges().find(
      (entry) => entry.settings.type === "customWords",
    );
    if (challenge === undefined) throw new Error("Missing challenge fixture");
    await typing.loadChallenge(challenge.name);
    expect(typing.config().mode).toBe("words");
    expect(store.config.mode).toBe("time");
    expect(typing.challenge()?.name).toBe(challenge.name);
    expect(typing.loadChallenge("wingdings")).rejects.toThrow("Wingdings");
    typing.clearChallenge();
    await typing.restart();
    expect(typing.config().mode).toBe("time");
    await store.flush();
  });
  test("an old command cannot close or clear a newly opened palette", async () => {
    let complete!: () => void;
    const palette = createPalette({
      root: () => ({
        title: "",
        list: [
          {
            id: "wait",
            display: "wait",
            exec: async () =>
              new Promise<void>((resolve) => {
                complete = resolve;
              }),
          },
        ],
      }),
      singleList: () => "manual",
    });
    palette.open();
    const running = palette.run();
    palette.close();
    palette.open({
      command: {
        id: "new",
        display: "new",
        input: { submit: () => undefined },
      },
    });
    palette.paste("new value");
    complete();
    await running;
    expect(palette.isOpen()).toBe(true);
    expect(palette.field.value()).toBe("new value");
    expect(palette.busy()).toBe(false);
  });
  test("ignores obsolete remote responses, logout and disposed owners", async () => {
    const [name, setName] = createSignal("first");
    const pending: Record<string, (value: string) => void> = {};
    let dispose!: () => void;
    const remote = createRoot((stop) => {
      dispose = stop;
      return createRemote((): Promise<string> | undefined => {
        const key = name();
        return key === ""
          ? undefined
          : new Promise<string>((resolve) => {
              pending[key] = resolve;
            });
      });
    });
    setName("second");
    pending["first"]?.("private stale data");
    await Promise.resolve();
    expect(remote.data()).toBeUndefined();
    pending["second"]?.("current");
    await Promise.resolve();
    expect(remote.data()).toBe("current");
    setName("");
    expect(remote.data()).toBeUndefined();
    setName("third");
    dispose();
    pending["third"]?.("disposed data");
    await Promise.resolve();
    expect(remote.data()).toBeUndefined();
  });
  test("persists multiline texts and separates tags by server and account", async () => {
    const root = await tempDir();
    const textFile = join(root, "texts.json");
    const library = await openTextLibrary(textFile);
    const settings = {
      ...library.current(),
      text: ["a\nb", "c\td"],
      pipeDelimiter: true,
    };
    library.setCurrent(settings);
    library.save("code", settings);
    await library.flush();
    const reopened = await openTextLibrary(textFile);
    expect(reopened.current()).toEqual(settings);
    expect(reopened.texts()[0]?.settings).toEqual(settings);
    const id = reopened.texts()[0]?.id;
    expect(id).toBeDefined();
    if (id !== undefined) reopened.remove(id);
    await reopened.flush();
    expect((await openTextLibrary(textFile)).texts()).toEqual([]);
    let owner: string | undefined = "server1|user1";
    const tagsFile = join(root, "tags.json");
    const tags = await openActiveTags(tagsFile, () => owner);
    tags.set(["one", "one"]);
    owner = "server2|user1";
    expect(tags.active()).toEqual([]);
    tags.toggle("two");
    owner = undefined;
    expect(tags.active()).toEqual([]);
    await tags.flush();
    owner = "server1|user1";
    expect((await openActiveTags(tagsFile, () => owner)).active()).toEqual([
      "one",
    ]);
  });
  test("keeps tags out of theme presets, includes them in behavior and full presets", () => {
    const config = getDefaultConfig();
    expect(presetSnapshot(config, ["one"], ["theme"])).not.toHaveProperty(
      "tags",
    );
    expect(presetSnapshot(config, ["one"], ["theme"])).not.toHaveProperty(
      "mode",
    );
    expect(presetSnapshot(config, ["one"], ["behavior"]).tags).toEqual(["one"]);
    expect(presetSnapshot(config, ["one"]).tags).toEqual(["one"]);
  });
  test("edits multiline text vertically, preserving columns and paste whitespace", () => {
    const field = createTextField("abcd\nx\nabcdef", { multiline: true });
    field.set(field.value(), 3);
    field.handleKey(key("down"));
    expect(field.cursor()).toBe(6);
    field.handleKey(key("down"));
    expect(field.cursor()).toBe(10);
    field.handleKey(key("home"));
    expect(field.cursor()).toBe(7);
    field.insert("A\r\nB\t");
    expect(field.value()).toBe("abcd\nx\nA\nB\tabcdef");
    const single = createTextField();
    single.insert("a\nb\tc");
    expect(single.value()).toBe("a b c");
  });
  test("renders announcement links, placeholders and long text in narrow columns", () => {
    const lines = announcementLines(
      [
        {
          _id: "123",
          message:
            '<b>Notice</b><br><a href="https://x.test">status</a> {dateNoTime}',
          date: 0,
          sticky: true,
          level: -1,
        },
      ],
      12,
      0,
    );
    expect(lines.map((line) => line.text).join("")).toContain("https://x.test");
    expect(lines[0]?.text).toBe("[important]");
    expect(lines.every((line) => line.text.length <= 12)).toBe(true);
    expect(lines.every((line) => line.level === -1)).toBe(true);
  });
  test("filters mode, tags, funbox, PB and inclusive date bounds", async () => {
    const result = (await finishedTest()).result;
    const tagged = {
      ...result,
      tags: ["one"],
      funbox: ["binary"] as const,
      isPb: true,
    };
    expect(
      matchesFilters(
        { ...tagged, funbox: ["binary"] },
        {
          mode: "words",
          tag: "one",
          funbox: "binary",
          pb: true,
          after: result.timestamp,
          before: result.timestamp,
        },
      ),
    ).toBe(true);
    expect(matchesFilters(result, { pb: true })).toBe(false);
    expect(matchesFilters(result, { mode: "quote" })).toBe(false);
    expect(historyFiltersSchema.safeParse({ unsupported: true }).success).toBe(
      false,
    );
  });
  test("retains no-quit tests across finishing, navigation and imports", async () => {
    const { test: typing, store } = await typingTest({
      words: ["cat ", "dog"],
    });
    store.set("mode", "words");
    store.set("words", 2);
    store.set("funbox", ["no_quit"]);
    await typing.restart();
    store.setTestActive(() => typing.status() === "running");
    await typing.insert("c", 0);
    const router = createRouter("test", typing.canInterrupt);
    router.push("settings");
    typing.finish(100);
    typing.cancel();
    expect(router.current()).toBe("test");
    expect(typing.status()).toBe("running");
    expect(() => store.reset()).toThrow("No quit");
    expect(() => store.apply({ mode: "zen" })).toThrow("No quit");
    await typing.insert("at dog", 200);
    expect(typing.status()).toBe("finished");
    router.push("settings");
    expect(router.current()).toBe("settings");
    await store.flush();
  });
  test("maps arrow alternatives, number-pad enter and visibility effects", () => {
    const config = getDefaultConfig();
    expect(
      inputAction(key("j"), { ...config, funbox: ["arrows"] }, []),
    ).toEqual({ type: "insert", text: "←" });
    expect(
      inputAction(
        key("return"),
        { ...config, funbox: ["58008"], quickRestart: "enter" },
        [],
      ),
    ).toEqual({ type: "insert", text: " " });
    expect(hideWord(["plus_one"], 3, 1, true, false)).toBe(true);
    expect(hideWord(["read_ahead_hard"], 2, 1, true, false)).toBe(true);
    expect(hideWord(["read_ahead_hard"], 2, 1, false, false)).toBe(false);
    expect(hideWord(["memory"], 0, 0, false, true)).toBe(true);
  });
});
