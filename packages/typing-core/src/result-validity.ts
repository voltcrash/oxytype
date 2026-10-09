import { CompletedEvent } from "@oxytype/schemas/results";
import { CustomTextLimitMode } from "@oxytype/schemas/util";
import {
  getDateBasedTestDurationMs,
  getKeypressesPerSecond,
} from "./events/stats";
import { EventLog } from "./events/types";

export type InvalidResultReason =
  | "inconsistent duration"
  | "failed"
  | "too short"
  | "afk"
  | "repeated"
  | "wpm"
  | "raw"
  | "accuracy";

export type ResultValidityInput = {
  result: Pick<
    CompletedEvent,
    "mode" | "mode2" | "testDuration" | "wpm" | "rawWpm" | "acc"
  >;
  eventLog: EventLog;
  bailedOut: boolean;
  /** Ended by difficulty, min burst or a timer failure. */
  failed: boolean;
  repeated: boolean;
  /** Users who opted out of leaderboards may save lower accuracy. */
  lbOptOut: boolean;
  customLimit: { mode: CustomTextLimitMode; value: number };
};

/** No input during the last five seconds; bailing out is never AFK. */
export function isAfkResult(eventLog: EventLog, bailedOut: boolean): boolean {
  if (bailedOut) return false;
  return getKeypressesPerSecond(eventLog)
    .slice(-5)
    .every((kps) => kps === 0);
}

/** The first reason a finished test must not be saved, in web check order. */
export function getInvalidResultReason(
  input: ResultValidityInput,
): InvalidResultReason | undefined {
  const { result, customLimit } = input;
  const { mode } = result;
  const mode2 = parseInt(result.mode2);
  const dateDuration = getDateBasedTestDurationMs(input.eventLog) / 1000;

  if (
    mode === "time" &&
    !input.bailedOut &&
    (result.testDuration < dateDuration - 0.1 ||
      result.testDuration > dateDuration + 0.1) &&
    result.testDuration <= 120
  ) {
    return "inconsistent duration";
  }
  if (input.failed) return "failed";
  if (
    result.testDuration < 1 ||
    (mode === "time" && mode2 < 15 && mode2 > 0) ||
    (mode === "time" && mode2 === 0 && result.testDuration < 15) ||
    (mode === "words" && mode2 < 10 && mode2 > 0) ||
    (mode === "words" && mode2 === 0 && result.testDuration < 15) ||
    (mode === "custom" &&
      (customLimit.mode === "word" || customLimit.mode === "section") &&
      customLimit.value < 10) ||
    (mode === "custom" &&
      customLimit.mode === "time" &&
      customLimit.value < 15) ||
    (mode === "zen" && result.testDuration < 15)
  ) {
    return "too short";
  }
  if (isAfkResult(input.eventLog, input.bailedOut)) return "afk";
  if (input.repeated) return "repeated";
  if (isSpeedInvalid(result.wpm, result)) return "wpm";
  if (isSpeedInvalid(result.rawWpm, result)) return "raw";
  const minAcc = input.lbOptOut ? 50 : 75;
  if (result.acc < minAcc || result.acc > 100) return "accuracy";
  return undefined;
}

function isSpeedInvalid(
  speed: number,
  result: Pick<CompletedEvent, "mode" | "mode2">,
): boolean {
  const words10 = result.mode === "words" && result.mode2 === "10";
  // Web parity: the 350 cap skips all words tests and any mode2 of 10.
  return (
    speed < 0 ||
    (speed > 350 && result.mode !== "words" && result.mode2 !== "10") ||
    (speed > 420 && words10)
  );
}
