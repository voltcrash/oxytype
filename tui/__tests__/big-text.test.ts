import { describe, expect, test } from "bun:test";

import { bigTextLines } from "../src/ui/big-text";

describe("big text", () => {
  test("renders three rows with one column between glyphs", () => {
    expect(bigTextLines("10")).toEqual(["▀█  █▀█", " █  █ █", "▀▀▀ ▀▀▀"]);
  });
});
