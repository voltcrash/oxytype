import { describe, it, expect } from "vite-plus/test";
import { loadParityCases } from "./fixtures";

const cases = loadParityCases();

describe("keystroke fixtures", () => {
  it("covers several modes", () => {
    const modes = new Set(cases.map((c) => c.fixture.config.mode));
    expect([...modes].sort()).toEqual(
      ["custom", "quote", "time", "words", "zen"].sort(),
    );
  });

  describe.each(cases.map((c) => [c.name, c] as const))("%s", (_name, c) => {
    it("was recorded from the web", () => {
      expect(c.fixture.recordedWith).toBe("web");
      expect(c.fixture.keystrokes.length).toBeGreaterThan(0);
      expect(c.fixture.eventLog.events.length).toBeGreaterThan(0);
    });

    it("has a frontend snapshot matching the web recording", () => {
      expect(c.snapshot).toBeDefined();
      expect(c.snapshot?.completedEvent).toEqual(c.fixture.completedEvent);
      expect(c.snapshot?.hash).toMatch(/^[0-9a-f]{40}$/);
    });
  });
});
