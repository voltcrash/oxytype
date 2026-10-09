import { describe, expect, test } from "bun:test";

import type { Cell } from "../src/test/layout";
import type { WordView } from "../src/test/word-view";

import { caretSlot, layoutWords, lineWindow } from "../src/test/layout";
import { buildWordView } from "../src/test/word-view";

function view(target: string, input = ""): WordView {
  return buildWordView(target, input, {
    blindMode: false,
    hideExtraLetters: false,
    indicateTypos: "off",
    zen: false,
    committed: false,
  });
}

const text = (cells: Cell[]): string => cells.map((it) => it.char).join("");

describe("words layout", () => {
  test("wraps at word boundaries", () => {
    const words = ["the ", "quick ", "brown ", "fox ", "jumps"].map((it) =>
      view(it),
    );
    const layout = layoutWords(words, 11);
    expect(layout.lines.map(text)).toEqual(["the quick", "brown fox", "jumps"]);
    expect(layout.slots[2]?.[0]).toEqual({ line: 1, column: 0 });
    expect(layout.slots[3]?.[3]).toEqual({ line: 1, column: 9 });
  });

  test("a word ending exactly at the edge stays on its line", () => {
    const layout = layoutWords([view("abc "), view("de")], 6);
    expect(layout.lines.map(text)).toEqual(["abc de"]);
  });

  test("breaks words wider than the line between letters", () => {
    const layout = layoutWords([view("a "), view("abcdefgh")], 4);
    expect(layout.lines.map(text)).toEqual(["a", "abcd", "efgh"]);
    expect(layout.slots[1]?.[4]).toEqual({ line: 2, column: 0 });
  });

  test("extra letters push following words along", () => {
    const layout = layoutWords([view("hi ", "hiya"), view("there")], 9);
    expect(layout.lines.map(text)).toEqual(["hiya", "there"]);
  });

  test("newline words end their line with a marker", () => {
    const layout = layoutWords([view("one\n"), view("two")], 40);
    expect(layout.lines.map(text)).toEqual(["one↵", "two"]);
    expect(layout.lines[0]?.at(-1)?.kind).toBe("newline");
    expect(caretSlot(layout, 0, 3)).toEqual({ line: 0, column: 3 });
  });

  test("wide characters take two columns", () => {
    const layout = layoutWords([view("日本 "), view("語")], 5);
    expect(layout.lines.map(text)).toEqual(["日本", "語"]);
    expect(caretSlot(layout, 0, 1)).toEqual({ line: 0, column: 2 });
  });

  test("clamps the caret to the letters shown", () => {
    const layout = layoutWords([view("hi")], 10);
    expect(caretSlot(layout, 0, 5)).toEqual({ line: 0, column: 2 });
    expect(caretSlot(layout, 3, 0)).toBeUndefined();
  });

  test("keeps the caret on the second of three visible lines", () => {
    expect(lineWindow(10, 0, false)).toEqual({ start: 0, end: 3 });
    expect(lineWindow(10, 1, false)).toEqual({ start: 0, end: 3 });
    expect(lineWindow(10, 2, false)).toEqual({ start: 1, end: 4 });
    expect(lineWindow(10, 9, false)).toEqual({ start: 8, end: 10 });
    expect(lineWindow(2, 0, false)).toEqual({ start: 0, end: 2 });
    expect(lineWindow(10, 5, true)).toEqual({ start: 0, end: 10 });
  });
});
