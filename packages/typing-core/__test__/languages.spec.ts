import { describe, it, expect, vi, Mock } from "vite-plus/test";
import { LanguageObject } from "@oxytype/schemas/languages";
import {
  createLanguageLoader,
  FetchJson,
  memoizeAsync,
} from "../src/languages";

const english = {
  name: "english",
  words: ["a", "b"],
  orderedByFrequency: true,
} as LanguageObject;
const french = { name: "french", words: ["c"] } as unknown as LanguageObject;

function fakeFetch(): Mock<FetchJson> {
  return vi.fn<FetchJson>(async (url) =>
    url.includes("french") ? french : english,
  );
}

describe("memoizeAsync", () => {
  it("calls the function once per key", async () => {
    const fn = vi.fn(async (n: number) => n * 2);
    const memoized = memoizeAsync(fn);
    expect(await memoized(2)).toBe(4);
    expect(await memoized(2)).toBe(4);
    expect(await memoized(3)).toBe(6);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe("createLanguageLoader", () => {
  it("loads from the default url", async () => {
    const fetchJson = fakeFetch();
    const loader = createLanguageLoader({ fetchJson });
    expect(await loader.getLanguage("english")).toBe(english);
    expect(fetchJson).toHaveBeenCalledWith("/languages/english.json");
  });

  it("caches languages", async () => {
    const fetchJson = fakeFetch();
    const loader = createLanguageLoader({
      fetchJson,
      getUrl: (lang) => `cache/${lang}`,
    });
    await loader.getLanguage("english");
    await loader.getLanguage("french");
    await loader.getLanguage("english");
    expect(fetchJson).toHaveBeenCalledTimes(2);
    expect(fetchJson).toHaveBeenCalledWith("cache/french");
  });

  it("rejects languages that fail verification", async () => {
    const loader = createLanguageLoader({
      fetchJson: fakeFetch(),
      verify: async () => {
        throw new Error("Integrity check failed");
      },
    });
    await expect(loader.getLanguage("english")).rejects.toThrow(
      "Integrity check failed",
    );
  });

  it("reports zipf support", async () => {
    const loader = createLanguageLoader({ fetchJson: fakeFetch() });
    expect(await loader.checkIfLanguageSupportsZipf("english")).toBe("yes");
    expect(await loader.checkIfLanguageSupportsZipf("french")).toBe("unknown");
  });
});
