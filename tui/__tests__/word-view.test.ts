import { describe, expect, test } from "bun:test";

import type { WordViewOptions } from "../src/test/word-view";

import { buildWordView } from "../src/test/word-view";

const options: WordViewOptions = {
  blindMode: false,
  hideExtraLetters: false,
  indicateTypos: "off",
  zen: false,
  committed: false,
};

function states(target: string, input: string, overrides = {}): string {
  return buildWordView(target, input, { ...options, ...overrides })
    .letters.map((it) => `${it.char}:${it.state}`)
    .join(" ");
}

describe("word view", () => {
  test("marks correct, incorrect, untyped and extra letters", () => {
    expect(states("word ", "")).toBe("w:untyped o:untyped r:untyped d:untyped");
    expect(states("word ", "wx")).toBe(
      "w:correct o:incorrect r:untyped d:untyped",
    );
    expect(states("hi ", "hiya")).toBe("h:correct i:correct y:extra a:extra");
  });

  test("never renders the commit separator as a letter", () => {
    expect(states("hi ", "hi ")).toBe("h:correct i:correct");
    const view = buildWordView("end\n", "end\n", options);
    expect(view.letters).toHaveLength(3);
    expect(view.newline).toBe(true);
  });

  test("shows typed characters when typos are indicated", () => {
    expect(states("cat ", "cut", { indicateTypos: "replace" })).toBe(
      "c:correct u:incorrect t:correct",
    );
    // Hints below letters are approximated by replacing them.
    expect(states("cat ", "cut", { indicateTypos: "below" })).toBe(
      "c:correct u:incorrect t:correct",
    );
  });

  test("hides extra letters and errors in blind mode", () => {
    expect(states("hi ", "hoya", { blindMode: true })).toBe(
      "h:correct i:correct",
    );
    expect(states("hi ", "hiya", { hideExtraLetters: true })).toBe(
      "h:correct i:correct",
    );
    const view = buildWordView("hi ", "ho ", {
      ...options,
      blindMode: true,
      committed: true,
    });
    expect(view.error).toBe(false);
  });

  test("flags committed words that do not match", () => {
    const commit = { ...options, committed: true };
    expect(buildWordView("hi ", "ho ", commit).error).toBe(true);
    expect(buildWordView("hi ", "hi ", commit).error).toBe(false);
    // The active word is never an error, even when wrong so far.
    expect(buildWordView("hi ", "ho", options).error).toBe(false);
  });

  test("zen mode shows the input as typed", () => {
    expect(states("", "free", { zen: true })).toBe(
      "f:correct r:correct e:correct e:correct",
    );
    expect(buildWordView("", "line\n", { ...options, zen: true }).newline).toBe(
      true,
    );
  });

  test("splits astral characters and shows tabs in one column", () => {
    expect(states("t𐑩e ", "t𐑩")).toBe("t:correct 𐑩:correct e:untyped");
    expect(states("\tif ", "")).toBe("→:untyped i:untyped f:untyped");
  });
});
