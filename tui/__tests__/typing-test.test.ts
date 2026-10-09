import { describe, expect, test } from "bun:test";

import { key, typingTest } from "./helpers/typing-test";

describe("typing session", () => {
  test("finishes words-10 through terminal key events", async () => {
    const words = "the quick brown fox jumps over the lazy dog again"
      .split(" ")
      .map((word, index) => word + (index === 9 ? "" : " "));
    const { test: typing, store } = await typingTest({ words });
    store.set("mode", "words");
    store.set("words", 10);
    await typing.restart();
    let now = 0;
    for (const char of words.join("")) {
      await typing.handleKey(
        key(char === " " ? "space" : char, { sequence: char }),
        now,
      );
      now += 180;
      typing.advance(now);
    }
    expect(typing.status()).toBe("finished");
    expect(typing.result()?.result).toMatchObject({
      client: "tui",
      offline: true,
      mode: "words",
      mode2: "10",
      acc: 100,
      charStats: [49, 0, 0, 0],
    });
    expect(
      typing.result()?.eventLog.events.some((event) => event.type === "keyup"),
    ).toBe(false);
    expect(typing.result()?.invalid).toBeUndefined();
    await store.flush();
  });

  test("backspace and ctrl+backspace use core regression rules", async () => {
    const { test: typing, store } = await typingTest({
      words: ["cat ", "dog"],
    });
    store.set("mode", "words");
    store.set("words", 2);
    await typing.restart();
    await typing.insert("cox ", 0);
    await typing.handleKey(key("backspace"), 100);
    expect(typing.activeIndex()).toBe(0);
    expect(typing.inputFor(0)).toBe("cox");
    await typing.handleKey(key("backspace", { ctrl: true }), 200);
    expect(typing.inputFor(0)).toBe("");
    await typing.insert("cat ", 300);
    await typing.handleKey(key("backspace"), 400);
    expect(typing.activeIndex()).toBe(1);
    expect(typing.inputFor(1)).toBe("");
    await store.flush();
  });

  test("time limit finishes at its tick and cleanup stops scheduling", async () => {
    const { test: typing } = await typingTest({ words: ["cat ", "dog"] });
    await typing.insert("c", 0);
    typing.advance(1000);
    expect(typing.stats().seconds).toBe(1);
    typing.advance(30000);
    expect(typing.status()).toBe("finished");
    expect(typing.result()?.result.testDuration).toBe(30);
    typing.cancel();
    typing.advance(60000);
    expect(typing.session().isActive()).toBe(false);
  });

  test("unavailable language falls back offline without changing saved preference", async () => {
    const { test: typing, store } = await typingTest();
    store.set("language", "french");
    await typing.restart();
    expect(typing.status()).toBe("ready");
    expect(typing.config().language).toBe("english");
    expect(store.config.language).toBe("french");
    expect(typing.notice()).toContain("not available offline");
    await store.flush();
  });
});
