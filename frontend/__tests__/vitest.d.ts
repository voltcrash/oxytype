// oxlint-disable typescript/consistent-type-definitions
import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers";
import type { TestActivityDay } from "../src/ts/elements/test-activity-calendar";

interface ActivityDayMatchers<R = TestActivityDay> {
  toBeDate: (date: string) => ActivityDayMatchers<R>;
  toHaveTests: (tests: number) => ActivityDayMatchers<R>;
  toHaveLevel: (level?: string | number) => ActivityDayMatchers<R>;
  toBeFiller: () => ActivityDayMatchers<R>;
}

declare module "vitest" {
  interface Assertion<R extends void | Promise<void> = void, T = unknown>
    extends ActivityDayMatchers<T>, TestingLibraryMatchers<R, T> {}
  interface AsymmetricMatchersContaining
    extends
      ActivityDayMatchers,
      TestingLibraryMatchers<MatcherResult, unknown> {}
}

interface MatcherResult {
  pass: boolean;
  message: () => string;
  actual?: unknown;
  expected?: unknown;
}
