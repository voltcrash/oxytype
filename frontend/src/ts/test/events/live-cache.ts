import { createLiveCache } from "@oxytype/typing-core/events/live-cache";
export const liveCache = createLiveCache();
export const {
  resetLiveCache,
  recordEventForCache,
  getLiveCachedAccuracy,
  getLiveCachedMsSinceLastInputEvent,
  getLiveCachedTimerStartMs,
  getLiveCachedTestDurationMs,
  getLiveCachedTestSeconds,
} = liveCache;
