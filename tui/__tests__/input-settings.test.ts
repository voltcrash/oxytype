import { describe, expect, test } from "bun:test";

import { key, typingTest } from "./helpers/typing-test";

async function type(
  typing: Awaited<ReturnType<typeof typingTest>>["test"],
  text: string,
): Promise<void> {
  for (const char of text) {
    await typing.handleKey(key(char === " " ? "space" : char), 0);
  }
}

describe("input settings in terminal tests", () => {
  test("stop on error holds incorrect letters", async () => {
    const { test: typing, store } = await typingTest({
      words: ["cat ", "dog"],
    });
    store.set("stopOnError", "letter");
    await typing.restart();
    await type(typing, "cx");
    expect(typing.inputFor(0)).toBe("c");
    await type(typing, "at ");
    expect(typing.activeIndex()).toBe(1);
    await store.flush();
  });

  test("max confidence disables backspace", async () => {
    const { test: typing, store } = await typingTest({
      words: ["cat ", "dog"],
    });
    store.set("confidenceMode", "max");
    await typing.restart();
    await type(typing, "cx");
    await typing.handleKey(key("backspace"), 0);
    expect(typing.inputFor(0)).toBe("cx");
    await store.flush();
  });

  test("strict space keeps a leading space in the current word", async () => {
    const { test: typing, store } = await typingTest({
      words: ["cat ", "dog"],
    });
    store.set("strictSpace", true);
    await typing.restart();
    await type(typing, " ");
    expect(typing.activeIndex()).toBe(0);
    await store.flush();
  });
});
