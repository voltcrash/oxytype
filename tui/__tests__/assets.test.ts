import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createLanguageLoader } from "@oxytype/typing-core/languages";
import { QuotesController } from "@oxytype/typing-core/quote-source";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { AssetUnavailableError, createAssetSource } from "../src/assets/source";
import { tempDir } from "./helpers/temp-dir";

const realFetch = globalThis.fetch;

beforeEach(() => {
  // Bundled assets must load without network access.
  globalThis.fetch = (async () => {
    throw new Error("network disabled in asset tests");
  }) as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

async function writeAsset(
  dir: string,
  asset: string,
  value: unknown,
): Promise<void> {
  await mkdir(join(dir, asset, ".."), { recursive: true });
  await writeFile(join(dir, asset), JSON.stringify(value));
}

describe("bundled assets", () => {
  test("core loads English 200 offline", async () => {
    const loader = createLanguageLoader({ fetchJson: createAssetSource() });
    const english = await loader.getLanguage("english");
    expect(english.name).toBe("english");
    expect(english.words).toHaveLength(200);
    expect(await loader.checkIfLanguageSupportsZipf("english")).toBe("yes");
  });

  test("core loads English quotes offline", async () => {
    const quotes = new QuotesController({
      fetchJson: createAssetSource(),
      getSnapshot: () => null,
    });
    const collection = await quotes.getQuotes("english");
    expect(collection.language).toBe("english");
    expect(collection.quotes.length).toBeGreaterThan(1000);
    expect(collection.groups).toHaveLength(4);
  });

  test("falls back to downloaded assets in the cache", async () => {
    const cacheDir = await tempDir();
    await writeAsset(cacheDir, "languages/french.json", {
      name: "french",
      words: ["bonjour"],
    });
    await writeAsset(cacheDir, "languages/english.json", {
      name: "english",
      words: ["stale"],
    });
    const loader = createLanguageLoader({
      fetchJson: createAssetSource({ cacheDir }),
    });
    expect((await loader.getLanguage("french")).words).toEqual(["bonjour"]);
    // Packaged assets take precedence over cached copies.
    expect((await loader.getLanguage("english")).words).toHaveLength(200);
  });

  test("reports assets that are neither bundled nor cached", async () => {
    const fetchJson = createAssetSource({ cacheDir: await tempDir() });
    const error = await fetchJson("/languages/spanish.json").catch(
      (it: unknown) => it,
    );
    expect(error).toBeInstanceOf(AssetUnavailableError);
    expect((error as AssetUnavailableError).asset).toBe(
      "languages/spanish.json",
    );

    const quotes = new QuotesController({ fetchJson, getSnapshot: () => null });
    expect((await quotes.getQuotes("spanish")).quotes).toEqual([]);
  });

  test("rejects URLs outside the asset folders", async () => {
    const fetchJson = createAssetSource();
    for (const url of [
      "../package.json",
      "/languages/../../package.json",
      "/themes/serika.json",
      "https://example.com/languages/english.json",
    ]) {
      const error = await fetchJson(url).catch((it: unknown) => it);
      expect(String(error)).toContain("Unsupported asset URL");
    }
  });
});
