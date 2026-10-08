import { describe, it, expect, vi } from "vite-plus/test";
import { getPoem } from "../src/poetry";
import { getSection } from "../src/wikipedia";
import { QuotesController } from "../src/quote-source";
import { LanguageObject } from "@oxytype/schemas/languages";

describe("injected text sources", () => {
  it("scrubs poems, caps sections and reports fetch failure", async () => {
    const poem = await getPoem(async () => [
      {
        title: "Poem",
        author: "Author",
        lines: [
          "one — _ two",
          Array.from({ length: 110 }, () => "word").join(" "),
        ],
      },
    ]);
    expect(poem !== false ? poem.words.slice(0, 3) : false).toEqual([
      "one",
      "two",
      "word",
    ]);
    expect(poem !== false ? poem.words.length : false).toBe(100);
    expect(
      await getPoem(async () => {
        throw new Error("offline");
      }),
    ).toBe(false);
  });
  it("uses language-specific Wikipedia endpoints and retries empty extracts", async () => {
    const fetchJson = vi
      .fn()
      .mockResolvedValueOnce({ title: "Empty", author: "Author", pageid: 1 })
      .mockResolvedValueOnce({ query: { pages: { "1": { extract: "" } } } })
      .mockResolvedValueOnce({ title: "Article", author: "Author", pageid: 2 })
      .mockResolvedValueOnce({
        query: { pages: { "2": { extract: "Été[12]\u200b — demain." } } },
      });
    const section = await getSection("french", {
      fetchJson,
      getLanguage: async () => ({ bcp47: "fr-FR" }) as LanguageObject,
      htmlToText: (text) => text,
    });
    expect(fetchJson.mock.calls[0]?.[0]).toContain("fr.wikipedia.org");
    expect(section.words).toEqual(["Été", "-", "demain."]);
    expect(section.title).toBe("Article");
  });
  it("rejects invalid extracts and propagates transport failure", async () => {
    const deps = {
      fetchJson: vi.fn().mockResolvedValue({ title: "Bad", pageid: 1 }),
      getLanguage: async () => ({ bcp47: "en" }) as LanguageObject,
      htmlToText: (text: string) => text,
    };
    await expect(getSection("english", deps)).rejects.toThrow();
    deps.fetchJson.mockRejectedValue(new Error("offline"));
    await expect(getSection("english", deps)).rejects.toThrow("offline");
  });
  it("loads quotes once and resolves language-normalized favorites", async () => {
    const fetchJson = vi.fn().mockResolvedValue({
      language: "english",
      groups: [[0, 100]],
      quotes: [{ id: 7, text: "A quote", source: "Author", length: 7 }],
    });
    const quotes = new QuotesController({
      fetchJson,
      getSnapshot: () => ({ favoriteQuotes: { english_1k: ["7"] } }),
    });
    await quotes.getQuotes("english", [0]);
    await quotes.getQuotes("english_1k", [0]);
    expect(fetchJson).toHaveBeenCalledTimes(1);
    expect(quotes.getRandomFavoriteQuote("english")?.id).toBe(7);
    expect(quotes.getRandomQuote()?.id).toBe(7);
    expect(quotes.getRandomQuote()?.id).toBe(7);
  });
});
