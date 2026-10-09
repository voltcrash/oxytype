import { expect, test } from "bun:test";

import { supportsBun } from "../src/cli/bun-version";

test("requires a supported stable Bun release", () => {
  for (const version of ["1.3.0", "1.4.2", "2.0.0"]) {
    expect(supportsBun(version)).toBe(true);
  }
  for (const version of ["0.9.0", "1.2.23", "1.3", "bad", "1.3.0-canary"]) {
    expect(supportsBun(version)).toBe(false);
  }
});
