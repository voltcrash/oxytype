import { describe, expect, it } from "vite-plus/test";
import { completedEvent } from "../__testData__/completed-event";
import { getKeyDataFailure } from "../../src/anticheat/keys";
import { consistency } from "../../src/anticheat/result";

describe("key telemetry integrity", () => {
  it("accepts aligned key holds/gaps spanning the test duration", () => {
    expect(getKeyDataFailure(completedEvent())).toBeUndefined();
  });
  it.each([NaN, Infinity, -1])("rejects invalid timing %s", (value) => {
    const event = completedEvent();
    event.keySpacing = [value];
    expect(getKeyDataFailure(event)).toBe("invalid-key-number");
    event.keySpacing = [];
    event.keyDuration = [value];
    expect(getKeyDataFailure(event)).toBe("invalid-key-number");
  });
  it("requires one hold per keydown and one fewer gap", () => {
    expect(getKeyDataFailure(completedEvent({ keyDuration: [10] }))).toBe(
      "key-count-mismatch",
    );
    expect(
      getKeyDataFailure(completedEvent({ keySpacing: [10], keyDuration: [] })),
    ).toBe("key-count-mismatch");
  });
  it("rejects shortened or inflated key timelines", () => {
    expect(getKeyDataFailure(completedEvent({ lastKeyToEnd: 0 }))).toBe(
      "key-timeline-mismatch",
    );
    expect(getKeyDataFailure(completedEvent({ startToFirstKey: 1000 }))).toBe(
      "key-timeline-mismatch",
    );
  });
  it("allows 100ms rounding tolerance but not larger timeline discrepancies", () => {
    expect(
      getKeyDataFailure(completedEvent({ startToFirstKey: 100 })),
    ).toBeUndefined();
    expect(getKeyDataFailure(completedEvent({ startToFirstKey: 101 }))).toBe(
      "key-timeline-mismatch",
    );
  });
  it("allows mobile/IME input without key events", () => {
    expect(
      getKeyDataFailure(
        completedEvent({ keySpacing: [], keyDuration: [], keyConsistency: 0 }),
      ),
    ).toBeUndefined();
  });
  it("allows pre-start held keys and missing-release placeholders", () => {
    const result = completedEvent();
    if (result.keyDuration === "toolong") {
      throw new Error("Missing test timings");
    }
    result.keyDuration[0] = 60_000;
    result.keyDuration[1] = 0;
    expect(getKeyDataFailure(result)).toBeUndefined();
  });
  it.each(["zen", "time"] as const)(
    "does not compare trimmed bailout/zen endpoints for %s",
    (mode) => {
      expect(
        getKeyDataFailure(
          completedEvent({ mode, bailedOut: true, lastKeyToEnd: 0 }),
        ),
      ).toBeUndefined();
    },
  );
  it("accepts long sentinels only together and beyond the client cutoff", () => {
    expect(
      getKeyDataFailure(
        completedEvent({ keySpacing: "toolong", keyDuration: "toolong" }),
      ),
    ).toBe("invalid-key-sentinel");
    expect(
      getKeyDataFailure(
        completedEvent({
          testDuration: 123,
          keySpacing: "toolong",
          keyDuration: "toolong",
        }),
      ),
    ).toBeUndefined();
    expect(
      getKeyDataFailure(
        completedEvent({ testDuration: 123, keySpacing: "toolong" }),
      ),
    ).toBe("invalid-key-sentinel");
  });
  it("checks consistency against all but the last interval", () => {
    const keySpacing = [100, 150, 4000];
    const event = completedEvent({
      keySpacing,
      keyDuration: [50, 100, 60, 80],
      lastKeyToEnd: 25_750,
      keyConsistency: consistency([100, 150]),
    });
    expect(getKeyDataFailure(event)).toBeUndefined();
    expect(
      getKeyDataFailure({ ...event, keyConsistency: consistency(keySpacing) }),
    ).toBe("key-consistency-mismatch");
  });
});
