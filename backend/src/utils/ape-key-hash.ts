import { createHash, timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";
import { compare } from "bcryptjs";
export function hashApeKey(key: string): string {
  return `sha256:${createHash("sha256").update(key).digest("hex")}`;
}
export async function verifyApeKey(
  key: string,
  hash: string,
): Promise<boolean> {
  if (!hash.startsWith("sha256:")) return await compare(key, hash);
  const expected = Buffer.from(hash),
    actual = Buffer.from(hashApeKey(key));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
