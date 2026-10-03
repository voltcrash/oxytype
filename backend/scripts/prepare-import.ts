import { BSON } from "mongodb";
import { createReadStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, basename } from "node:path";
import { createInterface } from "node:readline";
import { createHash } from "node:crypto";
import { z } from "zod/v3";
import { collections, mapDocument, rowSql } from "./mongo-mapping";
import { mapRedisSnapshot } from "./redis-mapping";
import type { ImportRow } from "./mongo-mapping";
import { createLocalD1 } from "./local-d1";
const Manifest = z.object({
  version: z.literal(1),
  redis: z
    .object({
      file: z.string(),
      sha256: z.string().length(64),
      count: z.number().int(),
    })
    .optional(),
  collections: z.record(
    z.object({
      file: z.string(),
      count: z.number().int().nonnegative(),
      sha256: z.string().length(64),
    }),
  ),
});
async function main(): Promise<void> {
  const input = process.argv[2],
    output = process.argv[3];
  if (
    input === undefined ||
    input === "" ||
    output === undefined ||
    output === ""
  ) {
    throw new Error("Usage: import:prepare <export-dir> <new-output-dir>");
  }
  const source = resolve(input),
    target = resolve(output);
  const manifest = Manifest.parse(
    JSON.parse(await readFile(resolve(source, "manifest.json"), "utf8")),
  );
  const derived = Object.keys(manifest.collections).filter((name) =>
    name.startsWith("leaderboards."),
  );
  const unsupported = Object.keys(manifest.collections).filter(
    (name) => !collections.includes(name) && !derived.includes(name),
  );
  if (unsupported.length) {
    throw new Error(
      `Unknown collections require explicit mapping: ${unsupported.join(", ")}`,
    );
  }
  await mkdir(target, { recursive: false, mode: 0o700 });
  const local = await createLocalD1();
  let part = 0,
    sql = "",
    bytes = 0;
  const expected = new Map<string, Set<string>>();
  const sourceCounts: Record<string, number> = {};
  const files: { file: string; sha256: string }[] = [];
  const flush = async (): Promise<void> => {
    if (!sql) return;
    const file = `${String(part++).padStart(6, "0")}.sql`;
    await writeFile(resolve(target, file), sql, { flag: "wx", mode: 0o600 });
    files.push({
      file,
      sha256: createHash("sha256").update(sql).digest("hex"),
    });
    sql = "";
    bytes = 0;
  };
  const append = async (query: string): Promise<void> => {
    const size = Buffer.byteLength(query) + 1;
    if (bytes + size > 500_000) await flush();
    sql += `${query}\n`;
    bytes += size;
  };
  const applyRow = async (row: ImportRow): Promise<void> => {
    const key = JSON.stringify(row.key.map((column) => row.values[column]));
    const keys = expected.get(row.table) ?? new Set<string>();
    keys.add(key);
    expected.set(row.table, keys);
    const queries = rowSql(row);
    // An entire row, including large text fragments, is validated atomically.
    await local.db.batch(queries.map((query) => local.db.prepare(query)));
    for (const query of queries) await append(query);
  };
  let redisSummary:
    | { discardedDiscordJobs: number; archivedKeys: number }
    | undefined;
  try {
    for (const collection of collections) {
      const item = manifest.collections[collection];
      if (!item) continue;
      if (basename(item.file) !== item.file) {
        throw new Error("Unsafe manifest path");
      }
      let count = 0;
      const digest = createHash("sha256");
      const stream = createReadStream(resolve(source, item.file));
      stream.on("data", (chunk) => digest.update(chunk));
      const lines = createInterface({ input: stream, crlfDelay: Infinity });
      for await (const line of lines) {
        if (!line) continue;
        count++;
        const rows = mapDocument(
          collection,
          BSON.EJSON.parse(line, { relaxed: false }),
        );
        for (const row of rows) {
          await applyRow(row);
        }
      }
      if (count !== item.count || digest.digest("hex") !== item.sha256) {
        throw new Error(`Export integrity mismatch: ${collection}`);
      }
      sourceCounts[collection] = count;
    }
    if (manifest.redis !== undefined) {
      if (basename(manifest.redis.file) !== manifest.redis.file) {
        throw new Error("Unsafe Redis manifest path");
      }
      const json = await readFile(resolve(source, manifest.redis.file), "utf8");
      if (
        createHash("sha256").update(json).digest("hex") !==
        manifest.redis.sha256
      ) {
        throw new Error("Redis checksum mismatch");
      }
      const mapped = mapRedisSnapshot(JSON.parse(json));
      for (const row of mapped.rows) await applyRow(row);
      redisSummary = {
        discardedDiscordJobs: mapped.discardedDiscordJobs,
        archivedKeys: mapped.archivedKeys,
      };
    }
    const tables: Record<string, number> = {};
    for (const [table, keys] of expected) {
      const count = await local.db
        .prepare(`SELECT count(*) AS count FROM ${table}`)
        .first<number>("count");
      if (count !== keys.size) throw new Error(`Count mismatch: ${table}`);
      tables[table] = count;
    }
    // Users retain compatibility JSON. Normalized references/identity are checked by D1's FKs/uniqueness.
    if (
      (await local.db.prepare("PRAGMA foreign_key_check").all()).results.length
    ) {
      throw new Error("Orphaned foreign keys");
    }
    await flush();
    await writeFile(
      resolve(target, "manifest.json"),
      `${JSON.stringify(
        {
          version: 1,
          validated: true,
          sourceCounts,
          tables,
          files,
          derivedCollections: derived,
          sessions:
            "preserved; use original auth secret or invalidate explicitly",
          redis:
            redisSummary ??
            "not supplied; drain jobs and reset active boards explicitly before production cutover",
        },
        null,
        2,
      )}\n`,
      { flag: "wx", mode: 0o600 },
    );
    console.info(
      `Validated ${files.length} ordered SQL files; counts in ${target}/manifest.json`,
    );
  } finally {
    await local.dispose();
  }
}
void main().catch((error: unknown) => {
  // Validation errors can contain source values. Keep diagnostics to category; files remain offline.
  console.error(
    "Import preparation failed",
    error instanceof Error ? error.name : "UnknownError",
  );
  process.exitCode = 1;
});
