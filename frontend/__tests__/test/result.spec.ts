import { describe, it, expect, beforeEach, vi } from "vitest";

// Baseline for what test/result.ts#update shows on the result screen (stat
// texts, hover labels, test type/other info, crown). DOM writes are recorded
// per selector so the expected values can be ported when the result screen
// moves to a store + Solid components (P3.x).

type FakeEl = {
  text?: string;
  html?: string;
  hidden?: boolean;
  attrs: Record<string, string>;
};

const dom = vi.hoisted(() => {
  const els = new Map<string, FakeEl>();
  const get = (selector: string): FakeEl => {
    let el = els.get(selector);
    if (el === undefined) {
      el = { attrs: {} };
      els.set(selector, el);
    }
    return el;
  };
  // chainable stand-in for ElementWithUtils that records the interesting calls
  const wrap = (selector: string): unknown => {
    const el = get(selector);
    const proxy: unknown = new Proxy(
      {},
      {
        get(_target, prop) {
          if (prop === Symbol.iterator) return [][Symbol.iterator];
          if (prop === "native") return undefined;
          return (...args: unknown[]) => {
            switch (prop) {
              case "setText":
                el.text = args[0] as string;
                el.html = undefined;
                break;
              case "setHtml":
                el.html = args[0] as string;
                el.text = undefined;
                break;
              case "appendHtml":
                el.html = (el.html ?? "") + (args[0] as string);
                break;
              case "setAttribute":
                el.attrs[args[0] as string] = args[1] as string;
                break;
              case "removeAttribute":
                Reflect.deleteProperty(el.attrs, args[0] as string);
                break;
              case "show":
                el.hidden = false;
                break;
              case "hide":
                el.hidden = true;
                break;
              case "hasClass":
                return args[0] === "hidden" && el.hidden === true;
              case "getParent":
                return wrap(`${selector} < parent`);
            }
            return proxy;
          };
        },
      },
    );
    return proxy;
  };
  return { els, get, wrap };
});

vi.mock("../../src/ts/utils/dom", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  qs: (selector: string) => dom.wrap(selector),
  qsa: (selector: string) => dom.wrap(selector),
}));

const state = vi.hoisted(() => ({
  authenticated: true,
  testInvalid: false,
  localPbWpm: 0,
  accuracy: { correct: 0, incorrect: 0 },
}));

const crown = vi.hoisted(() => ({
  show: vi.fn(),
  hide: vi.fn(),
  update: vi.fn(),
  getCurrentType: vi.fn(),
}));
vi.mock("../../src/ts/test/pb-crown", () => crown);

vi.mock("../../src/ts/controllers/chart-controller", () => {
  const datasets = new Map<string, Record<string, unknown>>();
  const scales = new Map<string, Record<string, unknown>>();
  return {
    result: {
      data: { labels: [] },
      options: { plugins: { annotation: { annotations: [] } } },
      getDataset: (id: string) => {
        if (!datasets.has(id)) datasets.set(id, { data: [], hidden: false });
        return datasets.get(id);
      },
      getScale: (id: string) => {
        if (!scales.has(id)) scales.set(id, { title: { text: "" } });
        return scales.get(id);
      },
      resize: vi.fn(),
      update: vi.fn(),
    },
  };
});
vi.mock("../../src/ts/controllers/ad-controller", () => ({
  updateFooterAndVerticalAds: vi.fn(),
  renderResult: vi.fn(),
}));
vi.mock("../../src/ts/controllers/quotes-controller", () => ({
  default: { isQuoteFavorite: () => false },
}));
vi.mock("../../src/ts/db", () => ({
  getLocalPB: () =>
    state.localPbWpm === 0 ? undefined : { wpm: state.localPbWpm },
  getSnapshot: () => undefined,
}));
vi.mock("../../src/ts/test/test-ui", () => ({
  toggleResultWords: vi.fn(),
  applyBurstHeatmap: vi.fn(),
}));
vi.mock("../../src/ts/test/today-tracker", () => ({
  getString: () => "",
}));
vi.mock("../../src/ts/test/focus", () => ({ set: vi.fn() }));
vi.mock("../../src/ts/test/funbox/funbox", () => ({ clear: vi.fn() }));
vi.mock("../../src/ts/input/input-element", () => ({
  blurInputElement: vi.fn(),
}));
vi.mock("../../src/ts/legacy-states/connection", () => ({
  get: () => true,
  showOfflineBanner: vi.fn(),
}));
vi.mock("../../src/ts/legacy-states/glarses-mode", () => ({
  get: () => false,
}));
vi.mock("../../src/ts/collections/tags", () => ({
  getLocalTagPB: () => 0,
  saveLocalTagPB: vi.fn(),
  __nonReactive: { getActiveTags: () => [], getTags: () => [] },
}));
vi.mock("../../src/ts/states/core", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  isAuthenticated: () => state.authenticated,
}));
vi.mock("../../src/ts/states/test", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getLastEventLog: () => [],
  getCurrentQuote: () => null,
  isTestInvalid: () => state.testInvalid,
}));
vi.mock("../../src/ts/test/events/stats", () => ({
  getAccuracy: () => state.accuracy,
  getRawHistory: () => [],
  getTimerBoundaryLabels: () => [],
}));
vi.mock("../../src/ts/utils/misc", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  promiseAnimate: vi.fn(),
  scrollToCenterOrTop: vi.fn(),
}));
vi.mock("canvas-confetti", () => ({ default: vi.fn() }));

import { update } from "../../src/ts/test/result";
import { __testing } from "../../src/ts/config/testing";
import type { CompletedEvent } from "@monkeytype/schemas/results";
import type { Config as ConfigType } from "@monkeytype/schemas/configs";
import type { Quote } from "../../src/ts/controllers/quotes-controller";

const { replaceConfig } = __testing;

function completedEvent(
  overrides: Partial<CompletedEvent> = {},
): CompletedEvent {
  return {
    wpm: 101.456,
    rawWpm: 110.789,
    acc: 96.543,
    consistency: 78.91,
    keyConsistency: 45.67,
    testDuration: 30.456,
    afkDuration: 3,
    charStats: [150, 5, 2, 1],
    mode: "time",
    mode2: "30",
    language: "english",
    funbox: [],
    bailedOut: false,
    punctuation: false,
    numbers: false,
    difficulty: "normal",
    lazyMode: false,
    chartData: { wpm: [100, 102], burst: [90, 110], err: [0, 1] },
    ...overrides,
  } as CompletedEvent;
}

type UpdateOptions = {
  difficultyFailed?: boolean;
  failReason?: string;
  afkDetected?: boolean;
  isRepeated?: boolean;
  tooShort?: boolean;
  quote?: Quote | null;
  dontSave?: boolean;
};

async function runUpdate(
  res: CompletedEvent,
  opts: UpdateOptions = {},
): Promise<void> {
  await update(
    res,
    opts.difficultyFailed ?? false,
    opts.failReason ?? "",
    opts.afkDetected ?? false,
    opts.isRepeated ?? false,
    opts.tooShort ?? false,
    opts.quote ?? null,
    opts.dontSave ?? false,
  );
}

const el = (selector: string): FakeEl => dom.get(selector);
const stat = (name: string): FakeEl => el(`#result .stats .${name} .bottom`);

function config(partial: Partial<ConfigType> = {}): void {
  replaceConfig({
    mode: "time",
    time: 30,
    language: "english",
    funbox: [],
    typingSpeedUnit: "wpm",
    alwaysShowDecimalPlaces: false,
    alwaysShowWordsHistory: false,
    ...partial,
  });
}

describe("result update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dom.els.clear();
    state.authenticated = true;
    state.testInvalid = false;
    state.localPbWpm = 0;
    state.accuracy = { correct: 150, incorrect: 5 };
    config();
  });

  describe("wpm / raw / acc", () => {
    it("shows rounded values with precise hover labels", async () => {
      await runUpdate(completedEvent());

      expect(el("#result .stats .wpm .top .text").text).toBe("wpm");
      expect(stat("wpm").text).toBe("101");
      expect(stat("wpm").attrs["aria-label"]).toBe("101.46 wpm");
      expect(stat("raw").text).toBe("111");
      expect(stat("raw").attrs["aria-label"]).toBe("110.79 wpm");
      expect(stat("acc").text).toBe("96%");
      expect(stat("acc").attrs["aria-label"]).toBe(
        "96.54%\n150 correct\n5 incorrect",
      );
    });

    it("shows 100% accuracy without decimals", async () => {
      await runUpdate(completedEvent({ acc: 100 }));

      expect(stat("acc").text).toBe("100%");
      expect(stat("acc").attrs["aria-label"]).toBe(
        "100%\n150 correct\n5 incorrect",
      );
    });

    it("shows Infinite for wpm >= 1000", async () => {
      await runUpdate(completedEvent({ wpm: 1000 }));

      expect(stat("wpm").text).toBe("Infinite");
    });

    it("converts to the configured typing speed unit", async () => {
      config({ typingSpeedUnit: "cpm" });
      await runUpdate(completedEvent());

      expect(el("#result .stats .wpm .top .text").text).toBe("cpm");
      expect(stat("wpm").text).toBe("507");
      expect(stat("wpm").attrs["aria-label"]).toBe("507.28 cpm (101.46 wpm)");
      expect(stat("raw").text).toBe("554");
      expect(stat("raw").attrs["aria-label"]).toBe("553.95 cpm (110.79 wpm)");
    });

    it("uses decimals in text when alwaysShowDecimalPlaces", async () => {
      config({ alwaysShowDecimalPlaces: true });
      await runUpdate(completedEvent());

      expect(stat("wpm").text).toBe("101.46");
      expect(stat("wpm").attrs["aria-label"]).toBeUndefined();
      expect(stat("raw").text).toBe("110.79");
      expect(stat("acc").text).toBe("96.54%");
      expect(stat("acc").attrs["aria-label"]).toBe("150 correct\n5 incorrect");
    });
  });

  describe("consistency / time / characters", () => {
    it("shows consistency with key consistency hover", async () => {
      await runUpdate(completedEvent());

      expect(stat("consistency").text).toBe("79%");
      expect(stat("consistency").attrs["aria-label"]).toBe(
        "78.91% (45.67% key)",
      );
    });

    it("shows consistency with decimals when alwaysShowDecimalPlaces", async () => {
      config({ alwaysShowDecimalPlaces: true });
      await runUpdate(completedEvent());

      expect(stat("consistency").text).toBe("78.91%");
      expect(stat("consistency").attrs["aria-label"]).toBe("45.67% key");
    });

    it("shows rounded time, afk percentage and hover", async () => {
      await runUpdate(completedEvent());

      expect(el("#result .stats .time .bottom .text").text).toBe("30s");
      expect(el("#result .stats .time .bottom .afk").text).toBe("9.85% afk");
      expect(stat("time").attrs["aria-label"]).toBe("30.46s (3s afk 9.85%)");
    });

    it("shows no afk text when there was no afk time", async () => {
      await runUpdate(completedEvent({ afkDuration: 0 }));

      expect(el("#result .stats .time .bottom .afk").text).toBe("");
      expect(stat("time").attrs["aria-label"]).toBe("30.46s (0s afk 0%)");
    });

    it("formats long tests as duration strings", async () => {
      await runUpdate(completedEvent({ testDuration: 125.4 }));
      expect(el("#result .stats .time .bottom .text").text).toBe("02:05");

      config({ alwaysShowDecimalPlaces: true });
      await runUpdate(completedEvent({ testDuration: 30.456 }));
      expect(el("#result .stats .time .bottom .text").text).toBe("30.46s");
      expect(stat("time").attrs["aria-label"]).toBe("3s afk 9.85%");
    });

    it("shows char stats", async () => {
      await runUpdate(completedEvent());

      expect(stat("key").text).toBe("150/5/2/1");
    });
  });

  describe("test type", () => {
    it("shows mode, mode2 and language", async () => {
      await runUpdate(completedEvent());

      expect(stat("testType").html).toBe("time 30<br>english");
    });

    it("lists enabled modifiers", async () => {
      config({
        mode: "words",
        words: 50,
        punctuation: true,
        numbers: true,
        blindMode: true,
        lazyMode: true,
        difficulty: "master",
        stopOnError: "word",
        deleteOnError: "letter_hard",
      });
      await runUpdate(completedEvent({ language: "english_1k" }));

      expect(stat("testType").html).toBe(
        "words 50<br>english 1k<br>punctuation<br>numbers<br>blind<br>lazy" +
          "<br>master<br>stop on word<br>delete on letter hard",
      );
    });

    it("shows quote length group", async () => {
      config({ mode: "quote" });
      await runUpdate(completedEvent(), {
        quote: {
          id: 1,
          language: "english",
          group: 2,
          source: "a book",
        } as Quote,
      });

      expect(stat("testType").html).toBe("quote long<br>english");
    });

    it("omits language in custom mode", async () => {
      config({ mode: "custom" });
      await runUpdate(completedEvent());

      expect(stat("testType").html).toBe("custom");
    });
  });

  describe("other info", () => {
    it("is hidden when there is nothing to show", async () => {
      await runUpdate(completedEvent());

      expect(el("#result .stats .info").hidden).toBe(true);
    });

    it("lists every flag", async () => {
      state.testInvalid = true;
      await runUpdate(completedEvent({ bailedOut: true, acc: 70 }), {
        difficultyFailed: true,
        failReason: "min wpm",
        afkDetected: true,
        isRepeated: true,
        tooShort: true,
      });

      expect(el("#result .stats .info").hidden).toBe(false);
      expect(stat("info").html).toBe(
        "failed (min wpm)<br>afk detected<br>invalid (accuracy)<br>repeated" +
          "<br>bailed out<br>too short",
      );
    });

    it("names invalid wpm and raw", async () => {
      state.testInvalid = true;
      await runUpdate(completedEvent({ wpm: 400, rawWpm: -1 }));

      expect(stat("info").html).toBe("invalid (wpm,raw)");
    });
  });

  describe("quote source", () => {
    it("shows source in quote mode", async () => {
      config({ mode: "quote" });
      await runUpdate(completedEvent(), {
        quote: {
          id: 1,
          language: "english",
          group: 0,
          source: "a book",
        } as Quote,
      });

      expect(el("#result .stats .source").hidden).toBe(false);
      expect(stat("source").html).toBe("a book");
    });

    it("is hidden outside quote mode", async () => {
      await runUpdate(completedEvent());

      expect(el("#result .stats .source").hidden).toBe(true);
    });
  });

  describe("crown", () => {
    const crownLabel = (): string | undefined =>
      el("#result .stats .wpm .crown").attrs["aria-label"];

    it("shows pending crown with diff for a new pb", async () => {
      state.localPbWpm = 90;
      await runUpdate(completedEvent());

      expect(crown.update).toHaveBeenLastCalledWith("pending");
      expect(crownLabel()).toBe("+11.46");
    });

    it("hides crown when not a pb", async () => {
      state.localPbWpm = 120;
      await runUpdate(completedEvent());

      expect(crown.update).not.toHaveBeenCalled();
      expect(crown.hide).toHaveBeenCalled();
      expect(crownLabel()).toBe("");
    });

    it("hides crown in quote mode or when not saving", async () => {
      config({ mode: "quote" });
      await runUpdate(completedEvent());
      expect(crown.update).not.toHaveBeenCalled();

      config();
      await runUpdate(completedEvent(), { dontSave: true });
      expect(crown.update).not.toHaveBeenCalled();
    });

    it("shows ineligible crown when pb is blocked by config", async () => {
      await runUpdate(completedEvent({ bailedOut: true }));

      expect(crown.update).toHaveBeenLastCalledWith("ineligible");
      expect(crownLabel()).toBe(
        "You could've gotten a new PB (+101.46), but your config does not allow it (bailed out)",
      );
    });

    it("shows warning crown when not eligible and not faster", async () => {
      state.localPbWpm = 120;
      config({ stopOnError: "letter" });
      await runUpdate(completedEvent());

      expect(crown.update).toHaveBeenLastCalledWith("warning");
      expect(crownLabel()).toBe(
        "This result is not eligible for a new PB (stop on letter)",
      );
    });
  });

  describe("login tip", () => {
    it("is shown only when logged out", async () => {
      await runUpdate(completedEvent());
      expect(el("main #result .loginTip").hidden).toBeUndefined();
      expect(el("#result .loginTip").hidden).toBe(true);

      state.authenticated = false;
      await runUpdate(completedEvent());
      expect(el("main #result .loginTip").hidden).toBe(false);
    });
  });
});
