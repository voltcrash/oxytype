import { describe, it, expect } from "vite-plus/test";
import {
  computeAutocorrelation,
  computeBellness,
  computeCrossStats,
  computeDistStats,
  computeDrift,
  computeKurtosis,
  computeRunsZ,
  detectQuantum,
  probit,
} from "../src/timing-stats";

// deterministic stand-in for Math.random so the sample statistics are stable
function lcg(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 2 ** 32;
    return state / 2 ** 32;
  };
}

function uniform(n: number, low: number, high: number, seed = 1): number[] {
  const random = lcg(seed);
  return Array.from({ length: n }, () => low + random() * (high - low));
}

describe("timing-stats", () => {
  it("inverts the normal cdf", () => {
    expect(probit(0.5)).toBeCloseTo(0, 6);
    expect(probit(0.975)).toBeCloseTo(1.96, 2);
    expect(probit(0.01)).toBeCloseTo(-2.326, 2);
  });

  it("pins bounded uniform draws near -1.2 excess kurtosis", () => {
    const kurtosis = computeKurtosis(uniform(2000, 80, 120));
    expect(kurtosis).not.toBeNull();
    expect(kurtosis as number).toBeCloseTo(-1.2, 1);
  });

  it("has no shape to measure for a fixed interval", () => {
    expect(computeKurtosis(Array.from({ length: 50 }, () => 80))).toBeNull();
  });

  it("finds memory in a trending series but not in independent draws", () => {
    const trending = Array.from({ length: 200 }, (_, i) => 80 + i);
    expect(computeAutocorrelation(trending)?.sigmas).toBeGreaterThan(5);
    const independent = computeAutocorrelation(uniform(400, 80, 120));
    expect(Math.abs(independent?.sigmas ?? Infinity)).toBeLessThan(3);
    expect(computeAutocorrelation([1, 2, 3])).toBeNull();
  });

  it("reports clumping as negative runs z", () => {
    const clumped = Array.from(
      { length: 100 },
      (_, i) => (Math.floor(i / 10) % 2 === 0 ? 50 : 150) + (i % 3),
    );
    expect(computeRunsZ(clumped)).toBeLessThan(-3);
  });

  it("measures drift between the first and last thirds", () => {
    const slowing = Array.from({ length: 90 }, (_, i) => (i < 45 ? 100 : 150));
    expect(computeDrift(slowing)).toBe(1.5);
    expect(computeDrift([1, 2])).toBeNull();
  });

  it("detects a coarse grid and ignores scattered values", () => {
    const grid = uniform(300, 60, 200).map((v) => Math.round(v / 8) * 8);
    expect(detectQuantum(grid)?.periodMs).toBeCloseTo(8, 1);
    expect(detectQuantum(uniform(300, 60, 200))).toBeNull();
  });

  it("scores a normal sample as bell shaped", () => {
    const random = lcg(7);
    const normal = Array.from(
      { length: 500 },
      () => 100 + 15 * probit(random()),
    );
    expect(computeBellness(normal, false)).toBeGreaterThan(0.99);
  });

  it("correlates aligned channels", () => {
    const spacings = Array.from({ length: 100 }, (_, i) => 80 + (i % 20) * 5);
    const cross = computeCrossStats(spacings, [
      ...spacings.map((v) => v / 2),
      40,
    ]);
    expect(cross.lag0?.r).toBeCloseTo(1, 6);
    expect(cross.overlapRate).toBe(0);
  });

  it("summarises a distribution", () => {
    const stats = computeDistStats([10, 20, 30, 40, 50]);
    expect(stats).toMatchObject({ n: 5, min: 10, p50: 30, max: 50, mean: 30 });
    expect(stats?.distinctCount).toBe(5);
    expect(computeDistStats([])).toBeNull();
  });
});
