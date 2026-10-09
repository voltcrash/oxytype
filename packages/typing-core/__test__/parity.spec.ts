import { describe, it, expect } from "vite-plus/test";
import { roundTo2 } from "@oxytype/util/numbers";
import { calculateConsistency, calculateWpm } from "../src/stats-math";
import { loadParityCases } from "./fixtures";

// typing-core output must match what the web computed for every fixture.

const cases = loadParityCases().map((c) => {
  if (c.snapshot === undefined) throw new Error(`${c.name}: no snapshot`);
  return [c.name, { ...c, snapshot: c.snapshot }] as const;
});

describe.each(cases)("%s", (_name, { snapshot }) => {
  const ce = snapshot.completedEvent as {
    wpm: number;
    rawWpm: number;
    charStats: [number, number, number, number];
    charTotal: number;
    testDuration: number;
    consistency: number;
    wpmConsistency: number;
    keyConsistency: number;
    keySpacing: number[];
    chartData: { wpm: number[]; burst: number[] };
  };

  it("stats math", () => {
    expect(roundTo2(calculateWpm(ce.charStats[0], ce.testDuration))).toBe(
      ce.wpm,
    );
    expect(roundTo2(calculateWpm(ce.charTotal, ce.testDuration))).toBe(
      ce.rawWpm,
    );
    expect(calculateConsistency(ce.chartData.burst)).toBe(ce.consistency);
    expect(calculateConsistency(ce.chartData.wpm)).toBe(ce.wpmConsistency);
    expect(calculateConsistency(ce.keySpacing.slice(0, -1))).toBe(
      ce.keyConsistency,
    );
  });
});
