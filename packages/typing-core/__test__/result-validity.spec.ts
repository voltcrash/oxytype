import { describe, it, expect } from "vite-plus/test";
import { EventLog } from "../src/events/types";
import {
  getInvalidResultReason,
  isAfkResult,
  ResultValidityInput,
} from "../src/result-validity";
import { loadParityCases } from "./fixtures";

function fixtureInput(name: string): ResultValidityInput {
  const entry = loadParityCases().find((c) => c.name === name);
  if (!entry) throw new Error(`Missing fixture ${name}`);
  const { fixture } = entry;
  return {
    result: fixture.completedEvent as ResultValidityInput["result"],
    eventLog: fixture.eventLog as EventLog,
    bailedOut: false,
    failed: false,
    repeated: false,
    lbOptOut: false,
    customLimit: { mode: "word", value: 9 },
  };
}

describe("getInvalidResultReason", () => {
  it.each(["words-10-clean", "words-10-errors", "time-15", "quote-short"])(
    "accepts the recorded %s result",
    (name) => {
      expect(getInvalidResultReason(fixtureInput(name))).toBeUndefined();
    },
  );

  it("rejects short tests and short custom limits", () => {
    expect(getInvalidResultReason(fixtureInput("zen"))).toBe("too short");
    expect(getInvalidResultReason(fixtureInput("custom-repeat"))).toBe(
      "too short",
    );
    expect(
      getInvalidResultReason({
        ...fixtureInput("custom-repeat"),
        customLimit: { mode: "word", value: 10 },
      }),
    ).toBeUndefined();
  });

  it("checks timed durations against the recorded dates", () => {
    const input = fixtureInput("time-15");
    const result = { ...input.result, testDuration: 14 };
    expect(getInvalidResultReason({ ...input, result })).toBe(
      "inconsistent duration",
    );
    expect(
      getInvalidResultReason({ ...input, result, bailedOut: true }),
    ).toBeUndefined();
  });

  it("reports failures, repeats and limits in web order", () => {
    const input = fixtureInput("words-10-errors");
    expect(getInvalidResultReason({ ...input, failed: true })).toBe("failed");
    expect(getInvalidResultReason({ ...input, repeated: true })).toBe(
      "repeated",
    );
    const fast = { ...input.result, wpm: 421 };
    expect(getInvalidResultReason({ ...input, result: fast })).toBe("wpm");
    const raw = { ...input.result, rawWpm: -1 };
    expect(getInvalidResultReason({ ...input, result: raw })).toBe("raw");
    const acc = { ...input.result, acc: 60 };
    expect(getInvalidResultReason({ ...input, result: acc })).toBe("accuracy");
    expect(
      getInvalidResultReason({ ...input, result: acc, lbOptOut: true }),
    ).toBeUndefined();
  });

  it("applies the 350 cap outside words tests", () => {
    const input = fixtureInput("time-15");
    const result = { ...input.result, wpm: 351 };
    expect(getInvalidResultReason({ ...input, result })).toBe("wpm");
    const words = fixtureInput("words-10-clean");
    expect(
      getInvalidResultReason({
        ...words,
        result: { ...words.result, wpm: 400 },
      }),
    ).toBeUndefined();
  });
});

describe("isAfkResult", () => {
  it("detects five idle seconds unless the test was bailed out", () => {
    const { eventLog } = fixtureInput("time-15");
    const events = eventLog.events.filter(
      (event) => event.type === "timer" || event.testMs < 9000,
    );
    const idle = { ...eventLog, events };
    expect(isAfkResult(eventLog, false)).toBe(false);
    expect(isAfkResult(idle, false)).toBe(true);
    expect(isAfkResult(idle, true)).toBe(false);
  });
});
