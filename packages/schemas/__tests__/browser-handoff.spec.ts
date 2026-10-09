import { describe, expect, it } from "vite-plus/test";
import { browserHandoffUrl, parseBrowserHandoff } from "../src/browser-handoff";

describe("terminal browser links", () => {
  it("round trips each form without losing its subject or site prefix", () => {
    for (const handoff of [
      { action: "quote-submit", language: "english" },
      { action: "quote-report", language: "french", quoteId: 42 },
      { action: "user-report", username: "Tester" },
    ] as const) {
      const url = new URL(
        browserHandoffUrl("https://example.test/oxy/", handoff),
      );
      expect(url.pathname).toBe("/oxy/");
      expect(parseBrowserHandoff(url.search)).toEqual(handoff);
    }
    expect(browserHandoffUrl("https://example.test/oxy", "signup")).toBe(
      "https://example.test/oxy/login",
    );
  });
  it("ignores ordinary links and rejects invalid actions or subjects", () => {
    expect(parseBrowserHandoff("?mode=words")).toBeUndefined();
    for (const search of [
      "?terminalAction=delete-account",
      "?terminalAction=quote-report&language=english&quoteId=-1",
      "?terminalAction=quote-submit&language=unknown",
      "?terminalAction=user-report&username=<script>",
    ]) {
      expect(() => parseBrowserHandoff(search)).toThrow();
    }
  });
});
