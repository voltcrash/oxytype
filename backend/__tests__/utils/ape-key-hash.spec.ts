import { describe, expect, it } from "vite-plus/test";
import { hashApeKey, verifyApeKey } from "../../src/utils/ape-key-hash";

describe("ApeKey SHA-256 hashes", () => {
  const abcHash =
    "sha256:ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";

  it("preserves the existing versioned hash format", () => {
    expect(hashApeKey("abc")).toBe(abcHash);
    expect(verifyApeKey("abc", abcHash)).toBe(true);
    expect(verifyApeKey("wrong", abcHash)).toBe(false);
  });

  it("rejects a legacy bcrypt hash even with its original key", () => {
    expect(
      verifyApeKey(
        "legacy-key",
        "$2b$04$Kodlfz8CUYk/M1iiU6Vt4.6pjbKR1nUYiLYFIr6b9D/opJGxSI01e",
      ),
    ).toBe(false);
  });

  it.each([
    "",
    abcHash.slice(7),
    "sha256:",
    abcHash.slice(0, -1),
    `${abcHash}0`,
    `${abcHash.slice(0, -1)}g`,
    abcHash.toUpperCase(),
    `sha512:${abcHash.slice(7)}`,
  ])("rejects unsupported or malformed hashes: %s", (hash) => {
    expect(verifyApeKey("abc", hash)).toBe(false);
  });
});
