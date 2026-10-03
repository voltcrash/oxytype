import { MongoClient, BSON } from "mongodb";
import { createWriteStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { once } from "node:events";
import { createHash } from "node:crypto";
async function main(): Promise<void> {
  const uri = process.env["MONGODB_URI"],
    database = process.env["MONGODB_DATABASE"],
    output = process.argv[2];
  if (
    uri === undefined ||
    uri === "" ||
    database === undefined ||
    database === "" ||
    output === undefined ||
    output === ""
  ) {
    throw new Error(
      "Set MONGODB_URI/MONGODB_DATABASE and pass a new export directory",
    );
  }
  const directory = resolve(output);
  await mkdir(directory, { recursive: false, mode: 0o700 });
  const client = new MongoClient(uri);
  const manifest: Record<
    string,
    { file: string; count: number; sha256: string }
  > = {};
  try {
    await client.connect();
    const db = client.db(database);
    for (const { name } of await db
      .listCollections({}, { nameOnly: true })
      .toArray()) {
      if (name.startsWith("system.")) continue;
      const file = `${encodeURIComponent(name)}.ndjson`,
        path = resolve(directory, file);
      const stream = createWriteStream(path, { flags: "wx", mode: 0o600 });
      const digest = createHash("sha256");
      let count = 0;
      try {
        for await (const document of db.collection(name).find()) {
          const line = `${BSON.EJSON.stringify(document, { relaxed: false })}\n`;
          digest.update(line);
          if (!stream.write(line)) await once(stream, "drain");
          count++;
        }
        stream.end();
        await once(stream, "finish");
      } catch (error) {
        stream.destroy();
        throw error;
      }
      manifest[name] = { file, count, sha256: digest.digest("hex") };
      console.info(`${name}: ${count} documents`);
    }
    await writeFile(
      resolve(directory, "manifest.json"),
      `${JSON.stringify(
        {
          version: 1,
          createdAt: new Date().toISOString(),
          collections: manifest,
        },
        null,
        2,
      )}\n`,
      { flag: "wx", mode: 0o600 },
    );
  } finally {
    await client.close();
  }
}
void main().catch((error: unknown) => {
  // Mongo connection errors can contain credentials; report the error category only.
  console.error(
    "Export failed",
    error instanceof Error ? error.name : "UnknownError",
  );
  process.exitCode = 1;
});
