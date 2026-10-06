import type { CompletedEvent } from "@oxytype/schemas/results";
import {
  computeAutocorrelation,
  computeCrossStats,
  computeKurtosis,
  combStrength,
  PAUSE_CUTOFF_MULTIPLE,
} from "@oxytype/util/timing-stats";
import { MIN_BOT_TIMING_SAMPLES } from "./bot";

/**
 * Statistical review signals. Unlike the checks in result.ts, keys.ts and
 * bot.ts, none of these is proof: each describes a property that synthetic
 * generators commonly have and that human samples rarely show. They are logged
 * for review and calibration, never used to reject a result or add a strike.
 */
export type ReviewSignal =
  // bounded random ranges have excess kurtosis near -1.2; human timing is
  // peaked with a long right tail
  | "uniform-gaps"
  | "uniform-holds"
  // near-constant timing that still escapes the exact fixed-timing check
  | "low-gap-variation"
  | "low-hold-variation"
  // no memory within gaps and no coupling between holds and gaps, which a
  // hand sharing one speed state between both rarely manages
  | "memoryless-timing"
  // values drawn from a small pool that browser clock coarsening cannot explain
  | "small-value-pool";

export const REVIEW_SIGNAL_THRESHOLDS = {
  uniformKurtosis: -1,
  minGapCv: 0.1,
  minHoldCv: 0.08,
  // |r| * sqrt(n) below this in every channel is indistinguishable from noise
  memorylessSigmas: 1.5,
  memorylessMinSamples: 200,
  maxDistinctRatio: 0.05,
  // clocks coarsened to at least this grid explain a small set of values
  coarseClockMs: 2,
  minGridStrength: 0.9,
} as const;

type ChannelFeatures = {
  n: number;
  p50: number;
  cv: number;
  kurtosis: number | null;
  autocorrelationSigmas: number | null;
  distinct: number;
  gridMs?: number | null;
};

export type TimingFeatures = {
  gaps: ChannelFeatures;
  holds: ChannelFeatures;
  lag0Sigmas: number | null;
  lag1Sigmas: number | null;
  overlapRate: number | null;
};

export type TimingReview = {
  signals: ReviewSignal[];
  features: TimingFeatures;
};

function round(value: number | null): number | null {
  return value === null ? null : Math.round(value * 1000) / 1000;
}

function median(sorted: number[]): number {
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

// variation of the typing itself; pauses between words or thoughts would
// otherwise dominate the spread of any sample
function typingCv(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const cutoff = median(sorted) * PAUSE_CUTOFF_MULTIPLE;
  const typing = sorted.filter((value) => value < cutoff);
  if (typing.length === 0) return 0;
  const mean = typing.reduce((sum, value) => sum + value, 0) / typing.length;
  if (mean <= 0) return 0;
  const variance =
    typing.reduce((sum, value) => sum + (value - mean) ** 2, 0) / typing.length;
  return Math.sqrt(variance) / mean;
}

function channel(values: number[]): ChannelFeatures {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    n: values.length,
    p50: median(sorted),
    cv: round(typingCv(values)) ?? 0,
    kurtosis: round(computeKurtosis(values)),
    autocorrelationSigmas: round(
      computeAutocorrelation(values)?.sigmas ?? null,
    ),
    distinct: new Set(values.map((value) => value.toFixed(3))).size,
  };
}

// A coarsened clock puts every value on multiples of one period, and the
// smallest step between distinct values is that period. A hardcoded pool has
// no such grid. detectQuantum cannot answer this: with only a handful of
// distinct values every period fits and its sweep finds no prominent peak.
function clockGrid(values: number[]): number | null {
  const distinct = [...new Set(values)].sort((a, b) => a - b);
  let step = Infinity;
  for (let i = 1; i < distinct.length; i++) {
    step = Math.min(
      step,
      (distinct[i] as number) - (distinct[i - 1] as number),
    );
  }
  if (!Number.isFinite(step) || step < REVIEW_SIGNAL_THRESHOLDS.coarseClockMs) {
    return null;
  }
  return combStrength(values, step) >= REVIEW_SIGNAL_THRESHOLDS.minGridStrength
    ? step
    : null;
}

function hasSmallPool(values: number[], features: ChannelFeatures): boolean {
  if (
    features.distinct >
    features.n * REVIEW_SIGNAL_THRESHOLDS.maxDistinctRatio
  ) {
    return false;
  }
  features.gridMs = round(clockGrid(values));
  return features.gridMs === null;
}

function quiet(sigmas: number | null): boolean {
  return (
    sigmas !== null &&
    Math.abs(sigmas) < REVIEW_SIGNAL_THRESHOLDS.memorylessSigmas
  );
}

/**
 * Review the interior key timings of a result. Returns undefined when there is
 * too little keyboard telemetry to describe: long-test sentinels, IME/mobile
 * input and short tests.
 */
export function getTimingReview(
  result: CompletedEvent,
): TimingReview | undefined {
  const { keySpacing, keyDuration } = result;
  if (keySpacing === "toolong" || keyDuration === "toolong") return undefined;
  if (keyDuration.length < result.charTotal) return undefined;

  // endpoints may predate the start or be estimated, as in the bot check;
  // zero holds are placeholders for releases that were never observed
  const gaps = keySpacing.slice(1, -1).filter((value) => value > 0);
  const holds = keyDuration.slice(1, -1).filter((value) => value > 0);
  if (gaps.length < MIN_BOT_TIMING_SAMPLES) return undefined;

  const cross = computeCrossStats(keySpacing, keyDuration);
  const features: TimingFeatures = {
    gaps: channel(gaps),
    holds: channel(holds),
    lag0Sigmas: round(cross.lag0?.sigmas ?? null),
    lag1Sigmas: round(cross.lag1?.sigmas ?? null),
    overlapRate: round(cross.overlapRate),
  };
  const holdsMeasured = holds.length >= MIN_BOT_TIMING_SAMPLES;
  const t = REVIEW_SIGNAL_THRESHOLDS;
  const uniform = (kurtosis: number | null): boolean =>
    kurtosis !== null && kurtosis <= t.uniformKurtosis;
  const checks: [ReviewSignal, () => boolean][] = [
    ["uniform-gaps", () => uniform(features.gaps.kurtosis)],
    ["uniform-holds", () => holdsMeasured && uniform(features.holds.kurtosis)],
    ["low-gap-variation", () => features.gaps.cv < t.minGapCv],
    [
      "low-hold-variation",
      () => holdsMeasured && features.holds.cv < t.minHoldCv,
    ],
    [
      "memoryless-timing",
      () =>
        gaps.length >= t.memorylessMinSamples &&
        holdsMeasured &&
        quiet(features.gaps.autocorrelationSigmas) &&
        quiet(features.lag0Sigmas) &&
        quiet(features.lag1Sigmas),
    ],
    [
      "small-value-pool",
      () =>
        hasSmallPool(gaps, features.gaps) ||
        (holdsMeasured && hasSmallPool(holds, features.holds)),
    ],
  ];
  const signals = checks
    .filter(([, check]) => check())
    .map(([signal]) => signal);

  return { signals, features };
}
