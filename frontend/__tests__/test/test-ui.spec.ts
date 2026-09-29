import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";

// Baseline for the word/letter markup test-ui.ts produces. Asserts the
// `.word > letter` structure + classes only (themes/funbox css target these),
// so it should survive the markup being moved/extracted (P3.8, P4.6).

// real dom helpers against a real (happy-dom) fixture instead of the global
// mock; required elements outside the fixture fall back to detached divs
vi.mock("../../src/ts/utils/dom", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../src/ts/utils/dom")>();
  return {
    ...actual,
    qsr: (selector: string) =>
      actual.qs(selector) ??
      new actual.ElementWithUtils(document.createElement("div")),
  };
});

// run animation frames synchronously and let tests await the async callbacks
const frames = vi.hoisted(() => ({ pending: [] as unknown[] }));
vi.mock("../../src/ts/utils/debounced-animation-frame", () => ({
  requestDebouncedAnimationFrame: (_id: string, cb: () => unknown) => {
    frames.pending.push(cb());
  },
  cancelPendingAnimationFrame: () => undefined,
  cancelPendingAnimationFramesStartingWith: () => undefined,
}));

// side-effectful modules unrelated to markup
vi.mock("../../src/ts/controllers/theme-controller", () => ({}));
vi.mock("../../src/ts/controllers/sound-controller", () => ({}));
vi.mock("../../src/ts/controllers/ad-controller", () => ({}));

const history = vi.hoisted(() => ({
  input: [] as string[],
  corrected: [] as string[],
  burst: [] as number[],
}));
vi.mock("../../src/ts/test/events/stats", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getInputHistory: () => history.input,
  getCorrectedWordsHistory: () => history.corrected,
  getWordBurstHistory: () => history.burst,
}));

const testState = vi.hoisted(() => ({ activeWordIndex: 0 }));
vi.mock("../../src/ts/states/test", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getActiveWordIndex: () => testState.activeWordIndex,
  getResultVisible: () => true,
  getLastEventLog: () => [],
}));

import { __testing } from "../../src/ts/config/testing";
import type { Config as ConfigType } from "@monkeytype/schemas/configs";
import { words as TestWords } from "../../src/ts/test/test-words";

type TestUIModule = typeof import("../../src/ts/test/test-ui");
let TestUI: TestUIModule;

const { replaceConfig } = __testing;

async function flushFrames(): Promise<void> {
  const pending = frames.pending;
  frames.pending = [];
  await Promise.all(pending);
}

function wordsEl(): HTMLElement {
  return document.querySelector("#words") as HTMLElement;
}

function wordEl(index: number): HTMLElement {
  return wordsEl().querySelector(
    `.word[data-wordindex='${index}']`,
  ) as HTMLElement;
}

/** `[text, className]` per letter; icons are reported by their fa class. */
function letters(word: Element): [string, string][] {
  return [...word.querySelectorAll("letter")].map((l) => {
    const icon = l.querySelector("i");
    const text = icon
      ? ([...icon.classList].find(
          (c) => c.startsWith("fa-") && c !== "fa-fw",
        ) ?? "")
      : (l.textContent ?? "");
    return [text, l.className.trim().replace(/\s+/g, " ")];
  });
}

function setWords(...words: string[]): void {
  TestWords.reset();
  words.forEach((w) => TestWords.push(w, 0));
}

function addWords(): void {
  for (let i = 0; i < TestWords.length; i++) {
    testState.activeWordIndex = i - 1; // appends synchronously
    TestUI.addWord(TestWords.get(i)?.display ?? "", i);
  }
  testState.activeWordIndex = 0;
}

async function type(
  input: string,
  wordIndex = 0,
  compositionData = "",
): Promise<[string, string][]> {
  await TestUI.updateWordLetters({ wordIndex, input, compositionData });
  await flushFrames();
  return letters(wordEl(wordIndex));
}

function config(partial: Partial<ConfigType> = {}): void {
  replaceConfig({
    mode: "words",
    funbox: [],
    tapeMode: "off",
    indicateTypos: "off",
    compositionDisplay: "off",
    showAllLines: true,
    ...partial,
  });
}

beforeAll(async () => {
  // undo the querySelector stub from __harness__/mock-dom.ts
  Reflect.deleteProperty(document, "querySelector");
  document.body.innerHTML = `
    <div class="pageTest">
      <textarea id="wordsInput"></textarea>
      <div id="wordsWrapper"><div id="words"></div></div>
      <div id="resultWordsHistory" class="hidden"><div class="words"></div></div>
    </div>`;
  TestUI = await import("../../src/ts/test/test-ui");
});

beforeEach(() => {
  wordsEl().innerHTML = "";
  frames.pending = [];
  config();
});

describe("test-ui word markup", () => {
  describe("addWord", () => {
    it("renders .word with data-wordindex and one bare letter per char", () => {
      setWords("hello ", "world");
      addWords();

      const words = wordsEl().querySelectorAll(".word");
      expect(words).toHaveLength(2);
      expect(words[0]?.getAttribute("data-wordindex")).toBe("0");
      expect(words[1]?.getAttribute("data-wordindex")).toBe("1");
      expect(letters(wordEl(0))).toEqual([
        ["h", ""],
        ["e", ""],
        ["l", ""],
        ["l", ""],
        ["o", ""],
      ]);
    });

    it("splits multi codepoint characters into single letters", () => {
      setWords("a👍b");
      addWords();
      expect(letters(wordEl(0)).map(([t]) => t)).toEqual(["a", "👍", "b"]);
    });

    it("renders tab and newline as icon letters + newline spacer divs", () => {
      setWords("a\tb\n", "c");
      addWords();

      expect(letters(wordEl(0))).toEqual([
        ["a", ""],
        ["fa-long-arrow-alt-right", "tabChar"],
        ["b", ""],
        ["fa-level-down-alt", "nlChar"],
      ]);
      const after = [...wordsEl().children].map((el) => el.className);
      expect(after).toEqual([
        "word",
        "beforeNewline",
        "newline",
        "afterNewline",
        "word",
      ]);
    });
  });

  describe("updateWordLetters", () => {
    beforeEach(() => {
      setWords("hello ", "world");
      addWords();
    });

    it("leaves untyped letters without class", async () => {
      expect(await type("")).toEqual([
        ["h", ""],
        ["e", ""],
        ["l", ""],
        ["l", ""],
        ["o", ""],
      ]);
    });

    it("marks correct and incorrect letters (target char shown)", async () => {
      expect(await type("hxl")).toEqual([
        ["h", "correct"],
        ["e", "incorrect"],
        ["l", "correct"],
        ["l", ""],
        ["o", ""],
      ]);
    });

    it("marks over-typed letters as incorrect extra", async () => {
      expect(await type("hello!x")).toEqual([
        ["h", "correct"],
        ["e", "correct"],
        ["l", "correct"],
        ["l", "correct"],
        ["o", "correct"],
        ["!", "incorrect extra"],
        ["x", "incorrect extra"],
      ]);
    });

    it("shows extra space as underscore", async () => {
      expect((await type("hello "))[5]).toEqual(["_", "incorrect extra"]);
    });

    it("shows typed char for incorrect letters when indicateTypos is replace", async () => {
      config({ indicateTypos: "replace" });
      expect(await type("hx")).toEqual([
        ["h", "correct"],
        ["x", "incorrect"],
        ["l", ""],
        ["l", ""],
        ["o", ""],
      ]);
    });

    it("renders composition chars as dead letters", async () => {
      expect(await type("h", 0, "e")).toEqual([
        ["h", "correct"],
        ["e", "dead correct"],
        ["l", ""],
        ["l", ""],
        ["o", ""],
      ]);
      expect((await type("h", 0, "x"))[1]).toEqual(["e", "dead"]);
    });

    it("updates only the given word", async () => {
      await type("w", 1);
      expect(letters(wordEl(0)).every(([, c]) => c === "")).toBe(true);
      expect(letters(wordEl(1))[0]).toEqual(["w", "correct"]);
    });
  });

  describe("updateWordLetters (zen)", () => {
    beforeEach(() => {
      config({ mode: "zen" });
      TestWords.reset();
      wordsEl().innerHTML = `<div class='word' data-wordindex='0'></div>`;
    });

    it("marks every typed letter correct", async () => {
      expect(await type("ab")).toEqual([
        ["a", "correct"],
        ["b", "correct"],
      ]);
    });

    it("renders an invisible placeholder when empty", async () => {
      expect(await type("")).toEqual([["_", "invisible"]]);
    });
  });

  describe("words history", () => {
    const historyWords = (): HTMLElement[] => [
      ...document.querySelectorAll<HTMLElement>(
        "#resultWordsHistory .words .word",
      ),
    ];

    async function loadHistory(): Promise<HTMLElement[]> {
      const container = document.querySelector("#resultWordsHistory");
      container?.classList.add("hidden");
      (container?.querySelector(".words") as HTMLElement).innerHTML = "";
      await TestUI.toggleResultWords(true);
      return historyWords();
    }

    beforeEach(() => {
      setWords("hello ", "world ", "foo ", "bar");
      history.input = [];
      history.corrected = [];
      history.burst = [];
    });

    it("marks correct, incorrect, extra and untyped letters", async () => {
      history.input = ["hxllo ", "worldzz ", "fo"];
      history.corrected = ["hxllo ", "worldzz ", "fo"];
      history.burst = [100, 90, 80];

      const words = await loadHistory();

      expect(letters(words[0] as HTMLElement)).toEqual([
        ["h", "correct"],
        ["e", "incorrect"],
        ["l", "correct"],
        ["l", "correct"],
        ["o", "correct"],
      ]);
      expect(letters(words[1] as HTMLElement)).toEqual([
        ["w", "correct"],
        ["o", "correct"],
        ["r", "correct"],
        ["l", "correct"],
        ["d", "correct"],
        ["z", "incorrect extra"],
        ["z", "incorrect extra"],
      ]);
      // untyped tail of the last word keeps a bare letter
      expect(letters(words[2] as HTMLElement)).toEqual([
        ["f", "correct"],
        ["o", "correct"],
        ["o", ""],
      ]);
    });

    it("marks letters fixed during typing as corrected", async () => {
      history.input = ["hello "];
      history.corrected = ["hxllo "];

      const [word] = await loadHistory();

      expect(letters(word as HTMLElement)[1]).toEqual(["e", "corrected"]);
    });

    it("sets error/nocursor classes and input/burst attributes on .word", async () => {
      history.input = ["hxllo ", "world "];
      history.corrected = ["", ""];
      history.burst = [100, 90];

      const words = await loadHistory();

      // input + 2 trailing words are rendered
      expect(words).toHaveLength(4);
      expect(words[0]?.className).toBe("word nocursor error");
      expect(words[0]?.getAttribute("input")).toBe("hxllo");
      expect(words[0]?.getAttribute("burst")).toBe("100");
      expect(words[1]?.className).toBe("word nocursor");
      expect(words[2]?.className).toBe("word");
      expect(words[2]?.getAttribute("input")).toBe("");
      expect(letters(words[2] as HTMLElement)).toEqual([
        ["f", ""],
        ["o", ""],
        ["o", ""],
      ]);
    });
  });
});
