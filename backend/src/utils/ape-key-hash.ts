import { createHash, timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";
export function hashApeKey(key: string): string {
  return `sha256:${createHash("sha256").update(key).digest("hex")}`;
}
export function verifyApeKey(key: string, hash: string): boolean {
  if (!/^sha256:[a-f0-9]{64}$/.test(hash)) return false;
  const expected = Buffer.from(hash),
    actual = Buffer.from(hashApeKey(key));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
