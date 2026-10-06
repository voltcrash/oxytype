import { describe, expect, it } from "vite-plus/test";
import { completedEvent } from "../__testData__/completed-event";
import { humanTimings } from "../__testData__/key-timings";
import { getTimingFingerprint } from "../../src/anticheat/replay";

describe("key timing replay fingerprint", () => {
  it("matches a timeline resubmitted with different metadata", () => {
    const timings = humanTimings(200, 1);
    expect(
      getTimingFingerprint(completedEvent({ ...timings, timestamp: 1 })),
    ).toBe(
      getTimingFingerprint(
        completedEvent({ ...timings, timestamp: 2, wpm: 90, mode2: "60" }),
      ),
    );
  });
  it("ignores sub-millisecond noise added to a recording", () => {
    const timings = humanTimings(200, 1);
    const noisy = {
      keySpacing: timings.keySpacing.map((value) => Math.round(value) + 0.3),
      keyDuration: timings.keyDuration.map((value) => Math.round(value) - 0.3),
    };
    expect(
      getTimingFingerprint(
        completedEvent({
          keySpacing: timings.keySpacing.map(Math.round),
          keyDuration: timings.keyDuration.map(Math.round),
        }),
      ),
    ).toBe(getTimingFingerprint(completedEvent(noisy)));
  });
  it("distinguishes different tests", () => {
    expect(getTimingFingerprint(completedEvent(humanTimings(200, 1)))).not.toBe(
      getTimingFingerprint(completedEvent(humanTimings(200, 2))),
    );
  });
  it("skips short, constant and long-test timelines", () => {
    expect(
      getTimingFingerprint(completedEvent(humanTimings(40, 1))),
    ).toBeUndefined();
    expect(
      getTimingFingerprint(
        completedEvent({
          keySpacing: Array.from({ length: 99 }, (_, i) => (i % 2 ? 100 : 200)),
          keyDuration: Array.from({ length: 100 }, () => 100),
        }),
      ),
    ).toBeUndefined();
    expect(
      getTimingFingerprint(
        completedEvent({ keySpacing: "toolong", keyDuration: "toolong" }),
      ),
    ).toBeUndefined();
  });
});
