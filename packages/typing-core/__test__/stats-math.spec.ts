import { describe, it, expect } from "vite-plus/test";
import {
  calculateAccuracy,
  calculateConsistency,
  calculateWpm,
} from "../src/stats-math";

describe("calculateWpm", () => {
  it("counts 5 characters as a word", () => {
    expect(calculateWpm(50, 60)).toBe(10);
    expect(calculateWpm(100, 15)).toBe(80);
  });

  it("is 0 without a duration", () => {
    expect(calculateWpm(50, 0)).toBe(0);
    expect(calculateWpm(50, -1)).toBe(0);
  });
});

describe("calculateAccuracy", () => {
  it("is the share of correct inputs", () => {
    expect(calculateAccuracy(3, 1)).toBe(75);
    expect(calculateAccuracy(5, 0)).toBe(100);
  });

  it("is 0 when nothing was typed", () => {
    expect(calculateAccuracy(0, 0)).toBe(0);
  });
});

describe("calculateConsistency", () => {
  it("is 100 for a constant series", () => {
    expect(calculateConsistency([80, 80, 80])).toBe(100);
  });

  it("drops with variation", () => {
    expect(calculateConsistency([60, 100, 80])).toBe(79.59);
  });

  it("is 0 when it can not be calculated", () => {
    expect(calculateConsistency([])).toBe(0);
    expect(calculateConsistency([0, 0])).toBe(0);
  });
});
