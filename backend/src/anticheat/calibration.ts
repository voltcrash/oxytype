import {
  type ReviewSignal,
  type TimingFeatures,
  reviewKeyTimings,
} from "./signals";

export type TimingSample = { keySpacing: number[]; keyDuration: number[] };

type Percentiles = { p5: number; p50: number; p95: number };

export type CalibrationReport = {
  samples: number;
  // samples with enough keyboard telemetry to review at all
  reviewed: number;
  // share of reviewed samples raising each signal, and any signal
  rates: Partial<Record<ReviewSignal | "any", number>>;
  features: Record<string, Percentiles>;
};

const FEATURES: Record<string, (features: TimingFeatures) => number | null> = {
  "gaps.cv": (f) => f.gaps.cv,
  "gaps.kurtosis": (f) => f.gaps.kurtosis,
  "gaps.autocorrelationSigmas": (f) => f.gaps.autocorrelationSigmas,
  "gaps.distinctRatio": (f) =>
    f.gaps.n > 0 ? f.gaps.distinct / f.gaps.n : null,
  "holds.cv": (f) => f.holds.cv,
  "holds.kurtosis": (f) => f.holds.kurtosis,
  lag0Sigmas: (f) => f.lag0Sigmas,
  lag1Sigmas: (f) => f.lag1Sigmas,
  overlapRate: (f) => f.overlapRate,
};

function isNumberArray(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === "number" && Number.isFinite(item))
  );
}

/**
 * Pull timing samples out of an export: a bare array, the admin audits
 * response, or audit rows whose message holds the arrays. Anything else,
 * including long-test sentinels, is skipped.
 */
export function extractSamples(input: unknown): TimingSample[] {
  const items =
    typeof input === "object" && input !== null && "data" in input
      ? input.data
      : input;
  if (!Array.isArray(items)) return [];
  return items.flatMap((item: unknown) => {
    if (typeof item !== "object" || item === null) return [];
    const record =
      "message" in item && typeof item.message === "object"
        ? (item.message as Record<string, unknown>)
        : (item as Record<string, unknown>);
    const { keySpacing, keyDuration } = record;
    return isNumberArray(keySpacing) && isNumberArray(keyDuration)
      ? [{ keySpacing, keyDuration }]
      : [];
  });
}

function percentiles(values: number[]): Percentiles {
  const sorted = [...values].sort((a, b) => a - b);
  const at = (p: number): number =>
    sorted[Math.round(p * (sorted.length - 1))] ?? NaN;
  return { p5: at(0.05), p50: at(0.5), p95: at(0.95) };
}

/** Signal rates and feature spreads of one labelled set of samples. */
export function calibrate(samples: TimingSample[]): CalibrationReport {
  const reviews = samples.flatMap((sample) => {
    const review = reviewKeyTimings(sample.keySpacing, sample.keyDuration);
    return review === undefined ? [] : [review];
  });
  const rates: CalibrationReport["rates"] = {};
  const rate = (count: number): number =>
    Math.round((count / reviews.length) * 10000) / 10000;
  if (reviews.length > 0) {
    const counts = new Map<ReviewSignal, number>();
    for (const { signals } of reviews) {
      for (const signal of signals) {
        counts.set(signal, (counts.get(signal) ?? 0) + 1);
      }
    }
    for (const [signal, count] of counts) rates[signal] = rate(count);
    rates.any = rate(reviews.filter((r) => r.signals.length > 0).length);
  }
  const features: CalibrationReport["features"] = {};
  for (const [name, read] of Object.entries(FEATURES)) {
    const values = reviews
      .map((review) => read(review.features))
      .filter((value): value is number => value !== null);
    if (values.length > 0) features[name] = percentiles(values);
  }
  return {
    samples: samples.length,
    reviewed: reviews.length,
    rates,
    features,
  };
}
