import { Miniflare } from "miniflare";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import type { D1Database } from "@cloudflare/workers-types";
/** Ephemeral workerd D1 for offline validation; no remote account access. */
export async function createLocalD1(): Promise<{
  db: D1Database;
  dispose: () => Promise<void>;
}> {
  const mf = new Miniflare({
    workers: [
      {
        config: {
          name: "d1-validation",
          compatibilityDate: "2026-10-02",
          manifest: {
            mainModule: "index.js",
            modules: {
              "index.js": {
                type: "esm",
                contents:
                  "export default { fetch() { return new Response('ok'); } }",
              },
            },
          },
          env: { DB: { type: "d1", name: "validation", id: "validation" } },
        },
      },
    ],
  });
  try {
    const db = await mf.getD1Database("DB");
    const path = resolve(__dirname, "../migrations");
    for (const file of (await readdir(path))
      .filter((name) => name.endsWith(".sql"))
      .sort()) {
      const queries = (await readFile(resolve(path, file), "utf8"))
        .split("--> statement-breakpoint")
        .filter((sql) => sql.trim());
      await db.batch(queries.map((sql) => db.prepare(sql)));
    }
    return { db, dispose: async () => await mf.dispose() };
  } catch (error) {
    await mf.dispose();
    throw error;
  }
}
