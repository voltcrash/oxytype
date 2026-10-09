import { expect, test } from "bun:test";
import { typingTest } from "./helpers/typing-test";

test("pace uses core advancement, corrects missed words and resets", async () => {
  const { test: typing, store } = await typingTest({
    words: ["cat ", "dog ", "bird"],
    getPaceSpeed: () => 60,
  });
  store.set("mode", "words");
  await typing.restart();
  await typing.insert("c", 0);
  typing.advance(600);
  expect(typing.pace()).toMatchObject({
    wordIndex: 0,
    letterIndex: 3,
    wpm: 60,
  });
  await typing.insert("x ", 700);
  typing.advance(800);
  expect(typing.pace()?.wordIndex).toBeGreaterThan(0);
  await typing.restart();
  expect(typing.pace()).toBeUndefined();
  await store.flush();
});
