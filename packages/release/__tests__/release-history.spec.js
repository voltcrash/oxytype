import { describe, expect, it } from "vite-plus/test";
import { buildReleaseHistory } from "../src/release-history.js";

function release(day, overrides = {}) {
  return {
    tag_name: `v2026.09.${String(day).padStart(2, "0")}`,
    name: `2026.09.${String(day).padStart(2, "0")}`,
    published_at: new Date(Date.UTC(2026, 8, day)).toISOString(),
    body: `Changes for day ${day}`,
    draft: false,
    prerelease: false,
    ...overrides,
  };
}

describe("buildReleaseHistory", () => {
  it("keeps only the ten most recently published releases", () => {
    const releases = Array.from({ length: 20 }, (_, i) => release(i + 1));
    const history = buildReleaseHistory(releases);
    expect(history.map((item) => item.tag_name)).toEqual(
      releases
        .slice(10)
        .reverse()
        .map((item) => item.tag_name),
    );
    expect(releases[0].tag_name).toBe("v2026.09.01");
  });

  it("excludes drafts and prereleases before applying the limit", () => {
    const published = Array.from({ length: 10 }, (_, i) => release(i + 1));
    const history = buildReleaseHistory([
      release(12, { draft: true }),
      release(11, { prerelease: true }),
      ...published,
    ]);
    expect(history).toHaveLength(10);
    expect(history[0].tag_name).toBe("v2026.09.10");
    expect(history.at(-1).tag_name).toBe("v2026.09.01");
  });

  it("preserves notes and strips unused GitHub metadata", () => {
    const notes =
      "### Fixes\n\n- A fix ([abc](https://github.com/o/r/commit/abc))";
    expect(buildReleaseHistory([release(1, { body: notes, id: 42 })])).toEqual([
      {
        tag_name: "v2026.09.01",
        name: "2026.09.01",
        published_at: "2026-09-01T00:00:00.000Z",
        body: notes,
      },
    ]);
  });

  it.each([null, "", "   "])(
    "uses the tag for untitled releases (%s)",
    (name) => {
      const [entry] = buildReleaseHistory([release(1, { name, body: null })]);
      expect(entry.name).toBe("v2026.09.01");
      expect(entry.body).toBe("");
    },
  );

  it("supports repositories with fewer than ten releases", () => {
    expect(buildReleaseHistory([release(1)])).toHaveLength(1);
    expect(buildReleaseHistory([])).toEqual([]);
  });
});
