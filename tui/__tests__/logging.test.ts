import { describe, expect, test } from "bun:test";
import { readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { createLogger } from "../src/logging";
import { createApi } from "../src/api/client";
import { networkSettingsSchema } from "../src/api/settings";
import { tempDir } from "./helpers/temp-dir";

describe("local diagnostics", () => {
  test("records API failures and debug timing without URLs credentials or bodies", async () => {
    const file = join(await tempDir(), "oxytype.log");
    const logger = createLogger(file, { debug: true });
    const api = createApi({
      settings: networkSettingsSchema.parse({
        apiUrl: "https://private-server.test/api",
      }),
      logger,
      token: () => "private-bearer",
      fetch: async () =>
        Response.json({ message: "private-response" }, { status: 503 }),
    });
    await api.auth("/private-path", { text: "private-typed-body" });
    await logger.flush();
    const log = await readFile(file, "utf8");
    expect(log).toContain('"event":"api.response"');
    expect(log).toContain('"status":503');
    expect(log).toContain('"durationMs":');
    expect(log).not.toContain("private-");
  });
  test("filters debug, serializes writes and keeps errors private", async () => {
    const file = join(await tempDir(), "oxytype.log");
    const logger = createLogger(file);
    logger.write("debug", "request");
    logger.write("info", "startup", { version: "26.10.4" });
    logger.error(
      "save",
      Object.assign(new Error("Bearer secret; typed words"), {
        code: "EACCES",
      }),
    );
    await logger.flush();
    const log = await readFile(file, "utf8");
    expect(log).toContain('"event":"startup"');
    expect(log).toContain('"code":"EACCES"');
    expect(log).not.toContain("secret");
    expect(log).not.toContain("typed words");
    expect(log).not.toContain("request");
    if (process.platform !== "win32") {
      expect((await stat(file)).mode & 0o777).toBe(0o600);
    }
  });

  test("enables debug and rotates one bounded backup", async () => {
    const file = join(await tempDir(), "oxytype.log");
    await writeFile(file, "previous session\n");
    const logger = createLogger(file, { debug: true, maxBytes: 120 });
    for (let i = 0; i < 5; i++) logger.write("debug", "request", { status: i });
    await logger.flush();
    expect(await readFile(file, "utf8")).toContain('"status":4');
    expect(await readFile(`${file}.1`, "utf8")).toContain('"status":3');
    expect((await stat(file)).size).toBeLessThanOrEqual(120);
    if (process.platform !== "win32") {
      expect((await stat(`${file}.1`)).mode & 0o777).toBe(0o600);
    }
  });

  test("reports unwritable logs once without an unhandled rejection", async () => {
    const directory = await tempDir();
    let failures = 0;
    const logger = createLogger(directory, { onFailure: () => failures++ });
    logger.write("info", "startup");
    expect(
      await logger.flush().then(
        () => false,
        () => true,
      ),
    ).toBe(true);
    logger.write("error", "shutdown");
    expect(
      await logger.flush().then(
        () => false,
        () => true,
      ),
    ).toBe(true);
    expect(failures).toBe(1);
  });
});
