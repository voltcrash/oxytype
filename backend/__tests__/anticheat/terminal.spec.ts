import { describe, expect, it } from "vite-plus/test";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import { CompletedEventSchema } from "@oxytype/schemas/results";
import {
  getResultFailure,
  getKeyDataFailure,
  getBotFailure,
  getTimingFingerprint,
  getTimingReview,
} from "../../src/anticheat";
import { completedEvent } from "../__testData__/completed-event";
import { consistency } from "../../src/anticheat/result";
const fixture = JSON.parse(
  readFileSync(
    resolve(__dirname, "../__testData__/terminal-words-10.json"),
    "utf8",
  ),
) as { source: string; result: unknown };
describe("terminal arrival telemetry", () => {
  it("accepts a recorded PTY session without fabricated key releases", () => {
    const result = CompletedEventSchema.parse(fixture.result);
    expect(fixture.source).toContain("not human calibration");
    expect(result.keyDuration).toEqual(
      Array.from({ length: result.charTotal }, () => 0),
    );
    expect(getResultFailure(result)).toBeUndefined();
    expect(getKeyDataFailure(result)).toBeUndefined();
    expect(getBotFailure(result)).toBeUndefined();
  });
  it("accepts varied arrival gaps and rejects missing terminal timing", () => {
    const result = completedEvent({
      client: "tui",
      keyDuration: Array.from({ length: 220 }, () => 0),
      keyOverlap: 0,
    });
    expect(getKeyDataFailure(result)).toBeUndefined();
    expect(getTimingReview(result)?.signals).not.toContain(
      "low-hold-variation",
    );
    expect(
      getKeyDataFailure({
        ...result,
        keySpacing: [],
        keyDuration: [],
        keyConsistency: 0,
      }),
    ).toBe("missing-terminal-key-data");
  });
  it("rejects fixed terminal gaps even when hold durations are unknown", () => {
    const result = completedEvent({
      client: "tui",
      keySpacing: Array.from({ length: 219 }, () => 100),
      keyDuration: Array.from({ length: 220 }, () => 0),
      keyOverlap: 0,
      lastKeyToEnd: 8100,
      keyConsistency: 100,
    });
    expect(getKeyDataFailure(result)).toBeUndefined();
    expect(getBotFailure(result)).toBe("uniform-key-timing");
  });
  it("fingerprints terminal gaps independently of unobserved hold durations", () => {
    const result = completedEvent({ client: "tui" });
    expect(getTimingFingerprint(result)).toBe(
      getTimingFingerprint({
        ...result,
        keyDuration: Array.from({ length: 220 }, () => 0),
      }),
    );
    const keySpacing = (result.keySpacing as number[]).map(
      (gap, i) => gap + (i % 3),
    );
    expect(getTimingFingerprint(result)).not.toBe(
      getTimingFingerprint({
        ...result,
        keySpacing,
        keyConsistency: consistency(keySpacing.slice(0, -1)),
      }),
    );
  });
});
