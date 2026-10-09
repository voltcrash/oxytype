import { describe, it, expect } from "vite-plus/test";
import { Wordset, withWords } from "../src/wordset";

describe("Wordset", () => {
  it("returns words in order and wraps around", () => {
    const wordset = new Wordset(["a", "b", "c"]);
    expect([1, 2, 3, 4].map(() => wordset.nextWord())).toEqual([
      "a",
      "b",
      "c",
      "a",
    ]);
  });

  it("shuffles through every word before repeating", () => {
    const wordset = new Wordset(["a", "b", "c", "d"]);
    const seen = [1, 2, 3, 4].map(() => wordset.shuffledWord());
    expect([...seen].sort()).toEqual(["a", "b", "c", "d"]);
  });

  it("picks random words from the list", () => {
    const wordset = new Wordset(["a", "b"]);
    for (let i = 0; i < 10; i++) {
      expect(["a", "b"]).toContain(wordset.randomWord("normal"));
      expect(["a", "b"]).toContain(wordset.randomWord("zipf"));
    }
  });
});

describe("withWords", () => {
  it("reuses the wordset for the same list and resets its indexes", async () => {
    const words = ["a", "b"];
    const first = await withWords(words);
    first.nextWord();
    const second = await withWords(words);
    expect(second).toBe(first);
    expect(second.nextWord()).toBe("a");
  });

  it("creates a new wordset for a new list", async () => {
    const first = await withWords(["a"]);
    const second = await withWords(["b"]);
    expect(second).not.toBe(first);
  });
});
