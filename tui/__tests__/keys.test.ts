import { describe, expect, test } from "bun:test";
import { formatKey, matchesKey } from "../src/keys";

const key = { name: "s", ctrl: false, meta: false, shift: false };

describe("key bindings", () => {
  test("match modifiers exactly", () => {
    expect(matchesKey({ ...key, ctrl: true }, { name: "s", ctrl: true })).toBe(
      true,
    );
    expect(matchesKey(key, { name: "s", ctrl: true })).toBe(false);
    expect(
      matchesKey(
        { ...key, ctrl: true, shift: true },
        { name: "s", ctrl: true },
      ),
    ).toBe(false);
  });

  test("format readable hints", () => {
    expect(formatKey({ name: "s", ctrl: true })).toBe("^s");
    expect(formatKey({ name: "s", ctrl: true, shift: true })).toBe(
      "ctrl+shift+s",
    );
    expect(formatKey({ name: "escape" })).toBe("esc");
    expect(formatKey({ name: "k", meta: true, shift: true })).toBe(
      "alt+shift+k",
    );
  });
});
