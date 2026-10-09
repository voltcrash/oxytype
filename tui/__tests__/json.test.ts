import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { readJson, removeFile, writeJson } from "../src/storage/json";
import { tempDir } from "./helpers/temp-dir";

const Schema = z.object({ name: z.string(), count: z.number() });

describe("JSON storage", () => {
  test("round-trips validated values and creates directories", async () => {
    const file = join(await tempDir(), "nested", "dir", "value.json");
    await writeJson(file, { name: "oxytype", count: 2 });
    expect(await readJson(file, Schema)).toEqual({
      status: "ok",
      value: { name: "oxytype", count: 2 },
    });
    expect(await readFile(file, "utf8")).toEndWith("}\n");
  });

  test("reports missing files", async () => {
    const file = join(await tempDir(), "missing.json");
    expect(await readJson(file, Schema)).toEqual({ status: "missing" });
  });

  test("reports malformed and schema-invalid files", async () => {
    const dir = await tempDir();
    await writeFile(join(dir, "broken.json"), "{ nope");
    await writeFile(join(dir, "wrong.json"), '{"name":1}');
    expect((await readJson(join(dir, "broken.json"), Schema)).status).toBe(
      "invalid",
    );
    expect((await readJson(join(dir, "wrong.json"), Schema)).status).toBe(
      "invalid",
    );
  });

  test("strips unknown keys through the schema", async () => {
    const file = join(await tempDir(), "value.json");
    await writeFile(file, '{"name":"a","count":1,"extra":true}');
    expect(await readJson(file, Schema)).toEqual({
      status: "ok",
      value: { name: "a", count: 1 },
    });
  });

  test("replaces files atomically without leaving temporary files", async () => {
    const dir = await tempDir();
    const file = join(dir, "value.json");
    await writeJson(file, { name: "first", count: 1 });
    await writeJson(file, { name: "second", count: 2 });
    expect(await readdir(dir)).toEqual(["value.json"]);
    expect(await readJson(file, Schema)).toMatchObject({
      value: { name: "second" },
    });
  });

  test("applies restrictive modes for secrets", async () => {
    const dir = await tempDir();
    const file = join(dir, "private", "token.json");
    await writeJson(file, { token: "secret" }, { mode: 0o600 });
    expect((await stat(file)).mode & 0o777).toBe(0o600);
    expect((await stat(join(dir, "private"))).mode & 0o777).toBe(0o700);
  });

  test("removes files idempotently", async () => {
    const file = join(await tempDir(), "value.json");
    await writeJson(file, { name: "a", count: 1 });
    await removeFile(file);
    await removeFile(file);
    expect(await readJson(file, Schema)).toEqual({ status: "missing" });
  });
});
