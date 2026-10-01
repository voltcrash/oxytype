import { describe, expect, it } from "vitest";
import {
  buildInitialWordMarkup,
  buildLiveWordMarkup,
} from "../../src/ts/test/word-markup";

function build(
  options: Partial<Parameters<typeof buildLiveWordMarkup>[0]>,
): ReturnType<typeof buildLiveWordMarkup> {
  return buildLiveWordMarkup({
    currentWord: "hello",
    input: "",
    compositionData: "",
    zen: false,
    indicateTypos: "off",
    compositionDisplay: "off",
    ...options,
  });
}

describe("live word markup builders", () => {
  it("preserves Unicode letters and newline spacer structure", () => {
    const html = buildInitialWordMarkup("a👍\n", 4);
    expect(html).toContain("data-wordindex='4'");
    expect(html).toContain("<letter>a</letter><letter>👍</letter>");
    expect(html).toContain("class='nlChar'");
    expect(html).toContain(
      "<div class='beforeNewline'></div><div class='newline'></div><div class='afterNewline'></div>",
    );
  });
  it("preserves typo replacement, adjacency and extra-space markup", () => {
    const result = build({ input: "hxzlo ", indicateTypos: "both" });
    expect(result.html).toContain('<letter class="correct ">h</letter>');
    expect(result.html).toContain('<letter class="incorrect ">x</letter>');
    expect(result.html).toContain(
      '<letter class="incorrect extra ">_</letter>',
    );
    expect(result.hintIndices).toEqual([[1, 2]]);
  });
  it("retains dead composition classes and remaining untyped letters", () => {
    expect(build({ input: "h", compositionData: "e" }).html).toContain(
      '<letter class="dead correct">e</letter><letter>l</letter>',
    );
    expect(
      build({ input: "h", compositionData: "x", compositionDisplay: "replace" })
        .html,
    ).toContain('<letter class="dead ">x</letter>');
  });
  it("keeps zen placeholders and newline insertion flags", () => {
    expect(build({ zen: true }).html).toBe(
      "<letter class='invisible'>_</letter>",
    );
    const result = build({ zen: true, input: "a\n" });
    expect(result.newlineafter).toBe(true);
    expect(result.html).toContain("class='nlChar correct'");
  });
  it("uses the injected funbox renderer for typed and untyped targets", () => {
    const getWordHtml = (char: string, letterTag?: boolean): string =>
      letterTag ? `<letter>${char.toUpperCase()}</letter>` : char.toUpperCase();
    expect(buildInitialWordMarkup("ab", 0, getWordHtml)).toContain(
      "<letter>A</letter><letter>B</letter>",
    );
    expect(build({ currentWord: "ab", input: "a", getWordHtml }).html).toBe(
      '<letter class="correct ">A</letter><letter>B</letter>',
    );
  });
});
