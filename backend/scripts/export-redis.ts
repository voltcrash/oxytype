import Redis from "ioredis";
import { writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { z } from "zod/v3";
async function main(): Promise<void> {
  const uri = process.env["REDIS_URI"],
    directory = process.argv[2];
  if (
    uri === undefined ||
    uri === "" ||
    directory === undefined ||
    directory === ""
  ) {
    throw new Error("Set REDIS_URI; pass the Mongo export directory");
  }
  const path = resolve(directory);
  const manifest = z
    .object({ version: z.literal(1), collections: z.record(z.unknown()) })
    .passthrough()
    .parse(JSON.parse(await readFile(resolve(path, "manifest.json"), "utf8")));
  const redis = new Redis(uri, { lazyConnect: true, maxRetriesPerRequest: 1 });
  try {
    await redis.connect();
    const keys = new Set<string>();
    for (const pattern of [
      "oxytype:*",
      "bull:later:*",
      "bull:george-tasks:*",
    ]) {
      let cursor = "0";
      do {
        const [next, found] = await redis.scan(
          cursor,
          "MATCH",
          pattern,
          "COUNT",
          100,
        );
        cursor = next;
        found.forEach((key) => keys.add(key));
      } while (cursor !== "0");
    }
    const entries = [];
    for (const key of [...keys].sort()) {
      const type = await redis.type(key),
        ttl = await redis.pttl(key),
        capturedAt = Date.now();
      if (type === "none") continue;
      const value =
        type === "string"
          ? await redis.get(key)
          : type === "hash"
            ? await redis.hgetall(key)
            : type === "zset"
              ? await redis.zrange(key, 0, "-1", "WITHSCORES")
              : type === "list"
                ? await redis.lrange(key, 0, -1)
                : type === "set"
                  ? await redis.smembers(key)
                  : undefined;
      if (value === undefined) {
        throw new Error("Unsupported Redis type; use a native snapshot");
      }
      const dump = await redis.dumpBuffer(key);
      entries.push({
        key,
        type,
        value,
        expiresAt: ttl < 0 ? null : capturedAt + ttl,
        dump: dump?.toString("base64"),
      });
    }
    const json = JSON.stringify(entries);
    await writeFile(resolve(path, "redis.json"), json, {
      flag: "wx",
      mode: 0o600,
    });
    await writeFile(
      resolve(path, "manifest.json"),
      `${JSON.stringify(
        {
          ...manifest,
          redis: {
            file: "redis.json",
            sha256: createHash("sha256").update(json).digest("hex"),
            count: entries.length,
          },
        },
        null,
        2,
      )}\n`,
      { mode: 0o600 },
    );
    console.info(
      `Exported ${entries.length} Redis keys; quiesce writers/consumers before capturing a final snapshot`,
    );
  } finally {
    redis.disconnect();
  }
}
void main().catch((error: unknown) => {
  console.error(
    "Redis export failed",
    error instanceof Error ? error.name : "UnknownError",
  );
  process.exitCode = 1;
});
