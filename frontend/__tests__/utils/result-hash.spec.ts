import objectHash from "object-hash";
import { describe, expect, it } from "vite-plus/test";

import {
  hashResult,
  preloadResultHasher,
} from "../../src/ts/utils/result-hash";

describe("result-hash", () => {
  it("matches object-hash so the server check still passes", async () => {
    const result = { wpm: 100, acc: 98.5, chartData: { wpm: [1, 2] } };
    expect(await hashResult(result)).toBe(objectHash(result));
  });

  it("reuses one loaded hasher", async () => {
    expect(await preloadResultHasher()).toBe(await preloadResultHasher());
  });
});
