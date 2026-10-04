import { describe, expect, it } from "vite-plus/test";
import {
  mergeReleasePages,
  releaseNotesToHtml,
  VersionHistoryRelease,
} from "../../src/ts/utils/release-notes";

describe("releaseNotesToHtml", () => {
  it("renders headings, lists and paragraphs with unix newlines", () => {
    expect(
      releaseNotesToHtml(
        "### Features\n\n- add a\n- add b\n\nThanks to\neveryone\n",
      ),
    ).toBe(
      "<h3>Features</h3><ul><li>add a</li><li>add b</li></ul><p>Thanks to everyone</p>",
    );
  });

  it("handles windows newlines", () => {
    expect(releaseNotesToHtml("### Fixes\r\n\r\n- fix a\r\n")).toBe(
      "<h3>Fixes</h3><ul><li>fix a</li></ul>",
    );
  });

  it("renders links, bold and code", () => {
    expect(
      releaseNotesToHtml(
        "- **settings:** add `x` ([abc1234](https://github.com/o/r/commit/abc))",
      ),
    ).toBe(
      '<ul><li><b>settings:</b> add <code>x</code> (<a href="https://github.com/o/r/commit/abc" target="_blank" rel="noopener noreferrer">abc1234</a>)</li></ul>',
    );
  });

  it("unescapes markdown escapes without rendering them", () => {
    expect(
      releaseNotesToHtml(
        "fix \\[link\\](https://example.com) \\<img\\> \\`a\\`",
      ),
    ).toBe("<p>fix [link](https://example.com) &lt;img&gt; `a`</p>");
  });

  it("escapes html and drops comments", () => {
    expect(
      releaseNotesToHtml('<img src="x" onerror="y">\n\n<!-- marker -->\n'),
    ).toBe("<p>&lt;img src=&quot;x&quot; onerror=&quot;y&quot;&gt;</p>");
  });

  it("does not link non http urls", () => {
    expect(releaseNotesToHtml("[x](javascript:alert(1))")).toBe(
      "<p>[x](javascript:alert(1))</p>",
    );
  });
});

describe("mergeReleasePages", () => {
  const release = (tag: string, timestamp: number): VersionHistoryRelease => ({
    tag,
    name: tag,
    publishedAt: "",
    timestamp,
    bodyHTML: "",
  });

  it("puts the newest release first", () => {
    expect(
      mergeReleasePages([
        { releases: [release("v1", 1), release("v3", 3)] },
        { releases: [release("v2", 2)] },
      ]).map((it) => it.tag),
    ).toEqual(["v3", "v2", "v1"]);
  });

  it("drops releases repeated when pages shift", () => {
    expect(
      mergeReleasePages([
        { releases: [release("v3", 3), release("v2", 2)] },
        { releases: [release("v2", 2), release("v1", 1)] },
      ]).map((it) => it.tag),
    ).toEqual(["v3", "v2", "v1"]);
  });
});
