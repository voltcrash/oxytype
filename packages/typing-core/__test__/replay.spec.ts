import { describe, expect, it } from "vite-plus/test";
import { replayDuration, replayFrame } from "../src/replay";
import type { EventLog } from "../src/events/types";
import { getInputHistory } from "../src/events/stats";
import { loadParityCases } from "./fixtures";

describe("input snapshot replay", () => {
  for (const { name, fixture } of loadParityCases()) {
    it(`reconstructs the final recorded inputs: ${name}`, () => {
      const log = fixture.eventLog as EventLog;
      const expected = getInputHistory(log);
      const frame = replayFrame(log, replayDuration(log));
      expect(
        Array.from(
          { length: expected.length },
          (_, i) => frame.inputs[i] ?? "",
        ),
      ).toEqual(expected);
      expect(replayFrame(log, -1).inputs).toEqual([]);
    });
  }
  it("seeks backwards and includes automatic corrections and word regression", () => {
    const log: EventLog = {
      version: 1,
      context: {
        targetWords: ["cat ", "dog"],
        mode: "words",
        mode2: "2",
        bailedOut: false,
        koreanStatus: false,
      },
      events: [
        {
          type: "input",
          testMs: 0,
          data: {
            inputType: "insertText",
            data: " ",
            wordIndex: 0,
            charIndex: 3,
            inputValue: "cox ",
            correct: false,
            commitsWord: true,
          },
        },
        {
          type: "input",
          testMs: 100,
          data: {
            inputType: "insertText",
            data: "x",
            wordIndex: 1,
            charIndex: 0,
            inputValue: "x",
            correct: false,
          },
        },
        {
          type: "input",
          testMs: 200,
          data: {
            inputType: "deleteWordBackward",
            wordIndex: 0,
            charIndex: 3,
            inputValue: "cox",
            clearedNextWord: true,
          },
        },
        {
          type: "input",
          testMs: 300,
          data: {
            inputType: "deleteContentBackward",
            wordIndex: 0,
            charIndex: 2,
            inputValue: "co",
            automatic: true,
          },
        },
        {
          type: "input",
          testMs: 400,
          data: {
            inputType: "insertText",
            data: "x",
            wordIndex: 0,
            charIndex: 2,
            inputValue: "co",
            correct: false,
            inputStopped: true,
          },
        },
      ],
    };
    expect(replayFrame(log, 150)).toEqual({
      inputs: ["cox ", "x"],
      activeIndex: 1,
    });
    expect(replayFrame(log, 250)).toEqual({
      inputs: ["cox", ""],
      activeIndex: 0,
    });
    expect(replayFrame(log, 500)).toEqual({
      inputs: ["co", ""],
      activeIndex: 0,
    });
    expect(replayFrame(log, 50)).toEqual({ inputs: ["cox "], activeIndex: 1 });
  });
});
