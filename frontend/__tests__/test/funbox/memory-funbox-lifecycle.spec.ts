import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";

vi.mock("../../../src/ts/controllers/ad-controller", () => ({
  updateFooterAndVerticalAds: vi.fn(),
  destroyResult: vi.fn(),
}));
vi.mock("../../../src/ts/controllers/sound-controller", () => ({
  clearAllSounds: vi.fn(),
}));
vi.mock("../../../src/ts/controllers/theme-controller", () => ({
  randomizeTheme: vi.fn(),
}));
vi.mock("../../../src/ts/components/pages/test/MonkeyPower", () => ({
  reset: vi.fn(),
}));
vi.mock("../../../src/ts/test/caret", () => ({
  resetPosition: vi.fn(),
  updatePosition: vi.fn(),
}));
vi.mock("../../../src/ts/test/pace-caret", () => ({
  resetCaretPosition: vi.fn(),
}));
vi.mock("../../../src/ts/test/focus", () => ({ set: vi.fn() }));
vi.mock("../../../src/ts/utils/debounced-animation-frame", () => ({
  requestDebouncedAnimationFrame: vi.fn(),
  cancelPendingAnimationFramesStartingWith: vi.fn(),
}));
vi.mock("../../../src/ts/states/connection", () => ({
  get: () => true,
}));

import { __testing } from "../../../src/ts/config/testing";
import {
  areWordsVisible,
  isWordsWrapperVisible,
  setWordsVisible,
  setWordsWrapperVisible,
} from "../../../src/ts/states/funbox";
import {
  getMemoryTimerText,
  getMemoryTimerVisibility,
} from "../../../src/ts/states/funbox-timers";
import { setResultElements } from "../../../src/ts/states/result";
import * as Funbox from "../../../src/ts/test/funbox/funbox";
import { getActiveFunboxesWithFunction } from "../../../src/ts/test/funbox/list";
import * as MemoryTimer from "../../../src/ts/test/funbox/memory-funbox-timer";
import * as TestUI from "../../../src/ts/test/test-ui";
import { words } from "../../../src/ts/test/test-words";

beforeEach(() => {
  vi.useFakeTimers();
  __testing.replaceConfig({ mode: "words", funbox: ["memory"] });
  MemoryTimer.reset();
  setWordsVisible(true);
  setWordsWrapperVisible(true);
  setResultElements(
    document.createElement("div"),
    document.createElement("div"),
  );
  words.reset();
  for (const word of ["one", "two", "three"]) words.push(word, 0);
});

afterEach(() => {
  MemoryTimer.reset();
  words.reset();
  vi.useRealTimers();
});

function restart(source: "testPage" | "resultPage" = "testPage"): void {
  for (const funbox of getActiveFunboxesWithFunction("restart")) {
    funbox.functions.restart();
  }
  TestUI.onTestRestart(source);
}

describe("memory funbox lifecycle", () => {
  it.each(["testPage", "resultPage"] as const)(
    "keeps counting down after restarting from %s",
    (source) => {
      restart(source);

      expect(getMemoryTimerVisibility()).toBe("shown");
      expect(getMemoryTimerText()).toBe("Timer left to memorise all words: 4s");
      expect(areWordsVisible()).toBe(true);
      expect(isWordsWrapperVisible()).toBe(true);

      vi.advanceTimersByTime(1000);
      expect(getMemoryTimerText()).toBe("Timer left to memorise all words: 3s");

      vi.advanceTimersByTime(3000);
      expect(getMemoryTimerVisibility()).toBe("hidden");
      expect(isWordsWrapperVisible()).toBe(false);
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it("restarts memorisation without keeping the previous countdown", () => {
    restart();
    vi.advanceTimersByTime(3000);

    restart();
    expect(getMemoryTimerText()).toBe("Timer left to memorise all words: 4s");
    expect(getMemoryTimerVisibility()).toBe("shown");

    vi.advanceTimersByTime(1000);
    expect(getMemoryTimerText()).toBe("Timer left to memorise all words: 3s");
    expect(isWordsWrapperVisible()).toBe(true);

    vi.advanceTimersByTime(3000);
    expect(getMemoryTimerVisibility()).toBe("hidden");
    expect(isWordsWrapperVisible()).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("ends memorisation when typing starts before the countdown expires", () => {
    restart();
    vi.advanceTimersByTime(1000);

    for (const funbox of getActiveFunboxesWithFunction("start")) {
      funbox.functions.start();
    }

    expect(getMemoryTimerVisibility()).toBe("hidden");
    expect(areWordsVisible()).toBe(false);
    expect(vi.getTimerCount()).toBe(0);

    vi.advanceTimersByTime(10000);
    expect(isWordsWrapperVisible()).toBe(true);
    expect(areWordsVisible()).toBe(false);
  });

  it("cancels memorisation when funboxes are cleared", async () => {
    restart();
    vi.advanceTimersByTime(1000);

    await Funbox.clear();
    expect(getMemoryTimerVisibility()).toBe("hidden");
    expect(isWordsWrapperVisible()).toBe(true);
    expect(vi.getTimerCount()).toBe(0);

    vi.advanceTimersByTime(10000);
    expect(isWordsWrapperVisible()).toBe(true);
  });
});
