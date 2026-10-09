import { roundTo2 } from "@oxytype/util/numbers";
import { TestEvent } from "./types";

// Running tallies maintained as events arrive, so live readers don't rescan
// the event log. For replay, derive from the event log directly.
export type LiveCache = {
  resetLiveCache: () => void;
  recordEventForCache: (event: TestEvent) => void;
  getLiveCachedAccuracy: () => number;
  getLiveCachedMsSinceLastInputEvent: () => number | null;
  getLiveCachedTimerStartMs: () => number | null;
  getLiveCachedTestDurationMs: (now: number) => number;
  getLiveCachedTestSeconds: (now: number) => number;
};
export function createLiveCache(): LiveCache {
  const cache = {
    correctInputs: 0,
    totalInputs: 0,
    timerStartMs: null as number | null,
    msSinceLastInputEvent: {
      value: null as number | null,
      lastEventMs: null as number | null,
    },
  };

  function resetLiveCache(): void {
    cache.correctInputs = 0;
    cache.totalInputs = 0;
    cache.timerStartMs = null;
    cache.msSinceLastInputEvent.value = null;
    cache.msSinceLastInputEvent.lastEventMs = null;
  }

  function recordEventForCache(event: TestEvent): void {
    if (event.type === "input") {
      if ("correct" in event.data) {
        cache.totalInputs++;
        if (event.data.correct) cache.correctInputs++;
      }
      if (cache.msSinceLastInputEvent.lastEventMs !== null) {
        cache.msSinceLastInputEvent.value = roundTo2(
          event.ms - cache.msSinceLastInputEvent.lastEventMs,
        );
      }
      cache.msSinceLastInputEvent.lastEventMs = event.ms;
    } else if (event.type === "timer" && event.data.event === "start") {
      cache.timerStartMs = event.ms;
    }
  }

  function getLiveCachedAccuracy(): number {
    return cache.totalInputs === 0
      ? 100
      : (cache.correctInputs / cache.totalInputs) * 100;
  }

  function getLiveCachedMsSinceLastInputEvent(): number | null {
    return cache.msSinceLastInputEvent.value;
  }

  function getLiveCachedTimerStartMs(): number | null {
    return cache.timerStartMs;
  }

  function getLiveCachedTestDurationMs(now: number): number {
    if (cache.timerStartMs === null) {
      throw new Error("Timer start ms not found in cache");
    }
    return now - cache.timerStartMs;
  }

  function getLiveCachedTestSeconds(now: number): number {
    const startMs = cache.timerStartMs ?? now;
    return Math.floor((now - startMs) / 1000);
  }

  return {
    resetLiveCache,
    recordEventForCache,
    getLiveCachedAccuracy,
    getLiveCachedMsSinceLastInputEvent,
    getLiveCachedTimerStartMs,
    getLiveCachedTestDurationMs,
    getLiveCachedTestSeconds,
  };
}
