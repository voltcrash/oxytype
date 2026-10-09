import { describe, it, expect } from "vite-plus/test";
import { buildPracticeWords } from "../src/practise-words";
import { createWeakSpot } from "../src/weak-spot";
import { createPaceState, advancePace, correctPace } from "../src/pace-caret";
import { EventLog } from "../src/events/types";
import { loadParityCases } from "./fixtures";
import { Wordset } from "../src/wordset";

const errors = loadParityCases().find((c) => c.name === "words-10-errors")
  ?.fixture.eventLog as EventLog;
describe("practice selection", () => {
  it("weights missed words and preserves preceding words for biword practice", () => {
    const words = errors.context.targetWords.map((word) =>
      word.replace(/[ \n]$/, ""),
    );
    const missed = buildPracticeWords(errors, words, "words", false);
    expect(missed?.text).toEqual(["school", "school", "school", "man", "do"]);
    expect(missed?.sectionLimit).toBe(15);
    const biwords = buildPracticeWords(errors, words, "biwords", false);
    expect(biwords?.text).toContain("would school");
    expect(biwords?.sectionLimit).toBe(15);
  });
  it("selects the slowest 20% of completed words", () => {
    const words = errors.context.targetWords.map((word) =>
      word.replace(/[ \n]$/, ""),
    );
    const slow = buildPracticeWords(errors, words, "off", true);
    expect(slow?.text.length).toBe(3);
    expect(slow?.sectionLimit).toBe(10);
  });
  it("keeps weak-spot learning isolated and penalizes errors", () => {
    const learner = createWeakSpot();
    learner.updateScore("x", false, 100);
    let sample = 0;
    const words = new Wordset(["x", "a"]);
    words.randomWord = () => (sample++ % 2 ? "x" : "a");
    expect(learner.getWord(words)).toBe("x");
    sample = 0;
    expect(createWeakSpot().getWord(words)).toBe("a");
  });
});

describe("pace math", () => {
  it("advances across words and corrects each mistake once", () => {
    const state = createPaceState(120);
    if (!state) throw new Error("No pace state");
    expect(state.spc).toBe(0.1);
    const words = ["abc", "def", "ghi"];
    const getWord = (index: number): string | undefined => words[index];
    correctPace(state, 0, false, "abc ", false);
    correctPace(state, 0, false, "abc ", false);
    expect(state.correction).toBe(4);
    expect(advancePace(state, getWord, false)).toBe(true);
    expect([state.currentWordIndex, state.currentLetterIndex]).toEqual([1, 1]);
    correctPace(state, 0, true, "abc ", false);
    expect(advancePace(state, getWord, false)).toBe(true);
    expect([state.currentWordIndex, state.currentLetterIndex]).toEqual([0, 2]);
  });
  it("ignores corrections in blind mode and handles invalid speed", () => {
    expect(createPaceState(0)).toBeNull();
    expect(createPaceState(Infinity)).toBeNull();
    const state = createPaceState(60);
    if (!state) throw new Error("No pace state");
    correctPace(state, 0, false, "abc ", true);
    expect(state.correction).toBe(0);
    expect(advancePace(state, () => undefined, true)).toBe(false);
  });
});
