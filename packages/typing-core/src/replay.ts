import type { EventLog } from "./events/types";

/** Input snapshots include corrections, regressions and automatic deletions. */
export function replayFrame(
  log: EventLog,
  timeMs: number,
): { inputs: string[]; activeIndex: number } {
  const inputs: string[] = [];
  let activeIndex = 0;
  for (const event of log.events) {
    if (event.type !== "input" || event.testMs > timeMs) continue;
    const data = event.data;
    inputs[data.wordIndex] = data.inputValue;
    if ("clearedNextWord" in data && data.clearedNextWord === true) {
      inputs[data.wordIndex + 1] = "";
    }
    activeIndex = data.wordIndex;
    if (
      "commitsWord" in data &&
      data.commitsWord === true &&
      data.lastWord !== true &&
      data.inputStopped !== true
    ) {
      activeIndex++;
    }
  }
  return { inputs, activeIndex };
}

export function replayDuration(log: EventLog): number {
  return log.events.reduce(
    (duration, event) => Math.max(duration, event.testMs),
    0,
  );
}
