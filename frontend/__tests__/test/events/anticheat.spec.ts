import { describe, expect, it, vi } from "vite-plus/test";
import type { CompletedEvent } from "@oxytype/schemas/results";
import { kogasa, mean, roundTo2, stdDev } from "@oxytype/util/numbers";
import { completedEvent } from "../../../../backend/__tests__/__testData__/completed-event";
import {
  getResultFailure,
  getKeyDataFailure,
  getBotFailure,
} from "../../../../backend/src/anticheat";
import { calculateWpm } from "../../../src/ts/utils/numbers";
import type {
  EventLog,
  TestEventNoMs,
} from "../../../src/ts/test/events/types";
import {
  getChars,
  getAccuracy,
  getTestDurationMs,
  getAfkDuration,
  getKeypressSpacing,
  getKeypressDurations,
  getKeypressOverlap,
  getLastKeypressToEndMs,
  getStartToFirstKeypressMs,
  getWpmHistory,
  getBurstHistory,
  getErrorCountHistory,
} from "../../../src/ts/test/events/stats";

vi.mock("../../../src/ts/config/store", () => ({
  Config: { mode: "time", funbox: [] },
}));

function eventLog(
  options: {
    preStart?: boolean;
    coarsened?: boolean;
    ime?: boolean;
    mode?: "zen" | "time";
    bailout?: boolean;
  } = {},
): EventLog {
  const text = "a".repeat(220);
  const events: TestEventNoMs[] = [
    { type: "timer", testMs: 0, data: { event: "start", timer: 0, date: 0 } },
  ];
  let time = 0;
  for (let i = 0; i < text.length; i++) {
    const down = i === 0 && options.preStart ? -16_000 : time;
    const stamp = options.coarsened ? Math.round(time / 100) * 100 : time;
    if (!options.ime) {
      events.push({
        type: "keydown",
        testMs: options.coarsened ? stamp : down,
        data: { code: "KeyA" },
      });
      events.push({
        type: "keyup",
        testMs: stamp + (options.coarsened ? 100 : 40 + (i % 7) * 5),
        data: { code: "KeyA" },
      });
    }
    events.push({
      type: "input",
      testMs: stamp,
      data: {
        inputType: options.ime ? "insertCompositionText" : "insertText",
        data: "a",
        correct: true,
        wordIndex: 0,
        charIndex: i,
        inputValue: text.slice(0, i + 1),
      },
    });
    time += 100 + (i % 11) * 5;
  }
  const end = options.bailout ? time + 300 : 30_000;
  for (let tick = 1; tick * 1000 < end; tick++) {
    events.push({
      type: "timer",
      testMs: tick * 1000,
      data: { event: "step", timer: tick },
    });
  }
  events.push({
    type: "timer",
    testMs: end,
    data: { event: "end", timer: Math.floor(end / 1000), date: end },
  });
  events.sort((a, b) => a.testMs - b.testMs);
  return {
    version: 1,
    context: {
      targetWords: [text],
      mode: options.mode ?? "time",
      mode2: "30",
      bailedOut: options.bailout ?? false,
      koreanStatus: false,
    },
    events,
  };
}

/** Build from the real client event reducers, not backend validator helpers. */
function payload(log: EventLog): CompletedEvent {
  const chars = getChars(log);
  const testDuration = getTestDurationMs(log) / 1000;
  const keySpacing = getKeypressSpacing(log);
  const wpm = getWpmHistory(log);
  const burst = getBurstHistory(log);
  const consistency = (values: number[]): number => {
    const value = roundTo2(kogasa(stdDev(values) / mean(values)));
    return Number.isNaN(value) ? 0 : value;
  };
  const charTotal = chars.allCorrect + chars.incorrect + chars.extra;
  return completedEvent({
    mode: log.context.mode,
    mode2: log.context.mode2,
    bailedOut: log.context.bailedOut,
    testDuration,
    afkDuration: getAfkDuration(log),
    charStats: [chars.correctWord, chars.incorrect, chars.extra, chars.missed],
    charTotal,
    wpm: roundTo2(calculateWpm(chars.correctWord, testDuration)),
    rawWpm: roundTo2(calculateWpm(charTotal, testDuration)),
    acc: roundTo2(getAccuracy(log).percentage),
    keySpacing,
    keyDuration: getKeypressDurations(log),
    keyOverlap: getKeypressOverlap(log),
    keyConsistency: consistency(keySpacing.slice(0, -1)),
    startToFirstKey: getStartToFirstKeypressMs(log),
    lastKeyToEnd: getLastKeypressToEndMs(log),
    chartData: { wpm, burst, err: getErrorCountHistory(log) },
    consistency: consistency(burst),
    wpmConsistency: consistency(wpm),
  });
}

describe("client events satisfy server anticheat", () => {
  it.each([
    {},
    { preStart: true },
    { coarsened: true },
    { ime: true },
    { bailout: true },
    { mode: "zen" },
  ] satisfies Parameters<typeof eventLog>[0][])(
    "accepts client telemetry for %j",
    (options) => {
      const result = payload(eventLog(options));
      expect(getResultFailure(result)).toBeUndefined();
      expect(getKeyDataFailure(result)).toBeUndefined();
      expect(getBotFailure(result)).toBeUndefined();
    },
  );
  it("detects score tampering after a genuine client payload is built", () => {
    const result = payload(eventLog());
    expect(getResultFailure({ ...result, wpm: result.wpm + 10 })).toBe(
      "score-mismatch",
    );
  });
});
