import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const fetchMock = vi.hoisted(() => {
  const mock = vi.fn<typeof window.fetch>();
  window.fetch = mock;
  return mock;
});

vi.mock("virtual:language-hashes", () => ({
  languageHashes: { english: "0123456789abcdef0123456789abcdef" },
}));

import {
  getLanguageUrl,
  getLatestRelease,
  getReleaseHistory,
} from "../../src/ts/utils/json-data";

describe("getLanguageUrl", () => {
  it("adds a content hash so cached copies stay valid", () => {
    expect(getLanguageUrl("english")).toBe(
      "/languages/english.json?v=0123456789abcdef",
    );
  });

  it("falls back to the plain URL when no hash is known", () => {
    expect(getLanguageUrl("english_1k")).toBe("/languages/english_1k.json");
  });
});

describe("release snapshot", () => {
  const releases = [
    {
      tag_name: "v2026.10.06",
      name: "2026.10.06",
      published_at: "2026-10-06T00:17:00Z",
      body: "### Fixes\n\n- Repair history",
    },
  ];

  beforeEach(() => {
    fetchMock
      .mockReset()
      .mockImplementation(async () => Response.json(releases));
  });

  it("fetches history from the site's JSON file", async () => {
    expect(await getReleaseHistory()).toEqual(releases);
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith("/release.json");
  });

  it("reads the footer version from the same JSON file", async () => {
    expect(await getLatestRelease()).toBe("2026.10.06");
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith("/release.json");
  });

  it("handles a site with no published releases", async () => {
    fetchMock.mockImplementation(async () => Response.json([]));
    expect(await getReleaseHistory()).toEqual([]);
    await expect(getLatestRelease()).rejects.toThrow("No release found");
  });

  it("allows a fresh fetch after a failed request", async () => {
    const errorLog = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    try {
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 503 }));
      await expect(getReleaseHistory()).rejects.toThrow("503");
      expect(await getReleaseHistory()).toEqual(releases);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      errorLog.mockRestore();
    }
  });
});
