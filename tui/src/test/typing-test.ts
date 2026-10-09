import type { KeyEvent } from "@opentui/core";
import type { Config } from "@oxytype/schemas/configs";
import type {
  CustomTextSettings,
  IncompleteTest,
} from "@oxytype/schemas/results";
import { defaultCustomTextSettings } from "@oxytype/typing-core/custom-text";
import {
  getAccuracy,
  getIncompleteTestSeconds,
  getRawHistory,
  getWordBurst,
} from "@oxytype/typing-core/events/stats";
import type { EventLog } from "@oxytype/typing-core/events/types";
import { canQuickRestart } from "@oxytype/typing-core/quick-restart";
import { getMode2 } from "@oxytype/typing-core/mode";
import {
  advancePace,
  correctPace,
  createPaceState,
  type PaceState,
} from "@oxytype/typing-core/pace-caret";
import type { QuoteWithTextSplit } from "@oxytype/typing-core/quotes";
import { getInvalidResultReason } from "@oxytype/typing-core/result-validity";
import {
  createTestSession,
  type LiveStats,
  type TestSession,
} from "@oxytype/typing-core/session";
import type { WordsGenerator } from "@oxytype/typing-core/words-generator";
import type { Accessor } from "solid-js";
import {
  batch,
  createContext,
  createSignal,
  onCleanup,
  useContext,
} from "solid-js";
import { unwrap } from "solid-js/store";

import type { ConfigStore } from "../config/store";
import type { TestSources } from "./sources";
import type { UploadIdentity } from "../auth/identity";
import { createGenerator } from "./generator";
import { inputAction, keyData } from "./input";

export type TestStatus = "loading" | "ready" | "running" | "finished" | "error";
export type LocalResult = ReturnType<TestSession["complete"]>;
export type FinishedTest = {
  result: LocalResult;
  eventLog: EventLog;
  rawHistory: number[];
  invalid?: string;
  failure?: string;
  owner?: UploadIdentity;
};
export type TypingTestOptions = {
  store: ConfigStore;
  sources: TestSources;
  customText?: CustomTextSettings;
  /** Deterministic words, e.g. for a recorded input fixture. */
  words?: string[];
  now?: () => number;
  dateNow?: () => number;
  /** Test harnesses drive advance themselves. */
  schedule?: boolean;
  getPaceSpeed?: (config: Config, mode2: string) => number;
  getIdentity?: () => UploadIdentity | undefined;
};
export type TypingTest = {
  status: Accessor<TestStatus>;
  notice: Accessor<string | undefined>;
  words: Accessor<readonly string[]>;
  activeIndex: Accessor<number>;
  inputFor: (index: number) => string;
  sectionIndex: Accessor<number | undefined>;
  revision: Accessor<number>;
  config: Accessor<Config>;
  stats: Accessor<LiveStats & { burst: number }>;
  result: Accessor<FinishedTest | undefined>;
  customText: CustomTextSettings;
  ready: Promise<void>;
  handleKey: (event: KeyEvent, now?: number) => Promise<void>;
  insert: (text: string, now: number) => Promise<void>;
  advance: (now: number) => void;
  finish: (now?: number) => void;
  restart: (repeat?: boolean, quick?: boolean) => Promise<void>;
  cancel: () => void;
  session: () => TestSession;
  pace: Accessor<
    { wordIndex: number; letterIndex: number; wpm: number } | undefined
  >;
};

export function createTypingTest(options: TypingTestOptions): TypingTest {
  const { store, sources } = options;
  const customText = structuredClone(
    options.customText ?? defaultCustomTextSettings,
  );
  const now = options.now ?? (() => performance.now());
  const dateNow = options.dateNow ?? (() => Date.now());
  const [status, setStatus] = createSignal<TestStatus>("loading");
  const [notice, setNotice] = createSignal<string>();
  const [words, setWords] = createSignal<readonly string[]>([]);
  const [activeIndex, setActiveIndex] = createSignal(0);
  const [revision, setRevision] = createSignal(0);
  const [config, setConfig] = createSignal<Config>(snapshotConfig());
  const emptyStats = (): LiveStats & { burst: number } => ({
    wpm: 0,
    raw: 0,
    acc: 100,
    seconds: 0,
    burst: 0,
  });
  const [stats, setStats] = createSignal(emptyStats());
  const [result, setResult] = createSignal<FinishedTest>();
  const [pace, setPace] = createSignal<{
    wordIndex: number;
    letterIndex: number;
    wpm: number;
  }>();
  let paceState: PaceState | null = null;
  let paceSteps = 0;
  let currentQuote: QuoteWithTextSplit | null = null;
  let generator: WordsGenerator | undefined;
  let sectionIndexes: number[] = [];
  let session: TestSession;
  let timer: ReturnType<typeof setInterval> | undefined;
  let generation = 0;
  let disposed = false;
  let repeated = false;
  let bailedOut = false;
  let abandoning = false;
  let restartCount = 0;
  let incompleteTests: IncompleteTest[] = [];
  let pending = Promise.resolve();
  let owner: UploadIdentity | undefined;

  function snapshotConfig(): Config {
    // Word/visual funboxes are Stage G. Never attribute an unimplemented effect.
    return { ...structuredClone(unwrap(store.config)), funbox: [] };
  }
  function stopTimer(): void {
    clearInterval(timer);
    timer = undefined;
  }
  function refresh(): void {
    if (config().mode === "zen") {
      session.setWords(
        Array.from({ length: session.getActiveWordIndex() + 1 }, (_, index) =>
          session.recorder.getInputForWord(index),
        ),
      );
    }
    batch(() => {
      setWords(session.getWords());
      setActiveIndex(session.getActiveWordIndex());
      setRevision((it) => it + 1);
    });
  }
  function makeSession(): void {
    session = createTestSession(config, {
      dateNow,
      generator: config().mode === "zen" ? undefined : generator,
      nospace: () => false,
      allWordsGenerated: () =>
        options.words !== undefined
          ? config().mode !== "time" && config().mode !== "zen"
          : (generator?.areAllWordsGenerated() ?? false),
      customLimit: () => customText.limit,
      getCurrentQuote: () => currentQuote,
    });
    session.on("input", (input) => {
      if (input.inputType === "insertText" && input.commitsWord) {
        const word = session.getWords()[input.wordIndex] ?? "";
        correctPace(
          paceState,
          input.wordIndex,
          input.inputValue === word,
          word,
          config().blindMode,
        );
      }
    });
    session.on("tick", (tick) =>
      setStats((previous) => ({ ...previous, ...tick })),
    );
    session.on("finish", ({ reason }) => {
      stopTimer();
      setPace(undefined);
      if (abandoning) return;
      session.recorder.cleanupData();
      const eventLog = session.buildEventLog();
      eventLog.context.bailedOut = bailedOut;
      const completed = session.complete(eventLog, {
        client: "tui",
        offline: owner?.online !== true,
        config: config(),
        currentQuote,
        customText: {
          ...customText,
          textLen: customText.text.join(" ").length,
        },
        tags: [],
        bailedOut,
        restartCount,
        incompleteTests,
        incompleteSeconds: incompleteTests.reduce(
          (sum, test) => sum + test.seconds,
          0,
        ),
        timestamp: dateNow(),
      });
      const invalid = getInvalidResultReason({
        result: completed,
        eventLog,
        bailedOut,
        failed: reason !== undefined,
        repeated,
        lbOptOut: false,
        customLimit: customText.limit,
      });
      batch(() => {
        refresh();
        setResult({
          result: completed,
          eventLog,
          rawHistory: getRawHistory(eventLog),
          invalid,
          failure: reason,
          owner,
        });
        setStatus("finished");
      });
      restartCount = 0;
      incompleteTests = [];
    });
  }
  async function load(repeat = false): Promise<void> {
    const version = ++generation;
    stopTimer();
    const previousWords = session?.getWords();
    const previousConfig = config();
    setStatus("loading");
    setNotice(undefined);
    setStats(emptyStats());
    setPace(undefined);
    bailedOut = false;
    repeated = repeat && previousWords !== undefined;
    owner = undefined;
    try {
      if (!repeated) {
        const snapshot = snapshotConfig();
        const loaded = await sources.loadLanguage(
          snapshot.language,
          snapshot.mode === "quote" ? snapshot.quoteLength : undefined,
        );
        if (version !== generation || disposed) return;
        snapshot.language = loaded.language.name;
        setConfig(snapshot);
        if (loaded.missing !== undefined) {
          setNotice(
            `${loaded.missing}${loaded.missingQuotes === true ? " quotes" : ""} is not available offline; using english`,
          );
        }
        if (store.config.funbox.length > 0) {
          setNotice("Funboxes are not available yet; using a standard test");
        }
        currentQuote = null;
        sectionIndexes = [];
        const baseGenerator = createGenerator({
          store,
          getConfig: config,
          sources,
          customText,
          getWordsLength: () => session?.getWords().length ?? 0,
          isRepeated: () => repeated,
          getCurrentQuote: () => currentQuote,
          setCurrentQuote: (quote) => {
            currentQuote = quote;
          },
        });
        generator = {
          ...baseGenerator,
          getNextWord: async (...args) => {
            const next = await baseGenerator.getNextWord(...args);
            sectionIndexes[args[0]] = next.sectionIndex;
            return next;
          },
        };
        makeSession();
        if (options.words !== undefined) {
          session.setWords(options.words);
        } else if (snapshot.mode === "zen") {
          session.setWords([""]);
        } else {
          const generated = await session.generate(loaded.language, generator);
          if (version !== generation || disposed) return;
          sectionIndexes = generated.sectionIndexes;
        }
      } else {
        setConfig(previousConfig);
        makeSession();
        session.setWords(previousWords ?? []);
      }
      if (version !== generation || disposed) return;
      refresh();
      paceState =
        config().mode === "zen"
          ? null
          : createPaceState(
              options.getPaceSpeed?.(
                config(),
                getMode2(config(), currentQuote),
              ) ??
                (config().paceCaret === "custom"
                  ? config().paceCaretCustomSpeed
                  : 0),
            );
      paceSteps = 0;
      setStatus("ready");
    } catch (error) {
      if (version !== generation || disposed) return;
      setNotice(
        error instanceof Error ? error.message : "Could not load the test",
      );
      setStatus("error");
    }
  }
  function startTimer(): void {
    if (!session.isActive()) return;
    setStatus("running");
    if (timer === undefined && options.schedule !== false) {
      timer = setInterval(() => {
        advance(now());
      }, 50);
    }
  }
  function advance(timestamp: number): void {
    session?.advance(timestamp);
    const start = session?.liveCache.getLiveCachedTimerStartMs();
    if (
      !session?.isActive() ||
      paceState === null ||
      start === null ||
      start === undefined
    ) {
      return;
    }
    const steps = Math.floor((timestamp - start) / (paceState.spc * 1000));
    while (paceSteps < steps) {
      if (
        !advancePace(
          paceState,
          (index) => session.getWords()[index],
          config().blindMode,
        )
      ) {
        paceState = null;
        setPace(undefined);
        return;
      }
      paceSteps++;
    }
    setPace({
      wordIndex: paceState.currentWordIndex,
      letterIndex: paceState.currentLetterIndex,
      wpm: paceState.wpm,
    });
  }
  async function insert(text: string, timestamp: number): Promise<void> {
    if (status() !== "ready" && status() !== "running") return;
    const version = generation;
    const wordIndex = session.getActiveWordIndex();
    if (!session.isActive()) owner = options.getIdentity?.();
    await session.insert(text, timestamp);
    if (version !== generation || disposed) return;
    if (
      session.isActive() &&
      generator !== undefined &&
      config().mode !== "zen" &&
      options.words === undefined
    ) {
      while (
        session.getWords().length - session.getActiveWordIndex() < 25 &&
        !generator.areAllWordsGenerated()
      ) {
        const generatedWords = session.getWords();
        await session.nextWord(
          generatedWords.length,
          100,
          generatedWords.at(-1)?.replace(/[ \n]$/, ""),
          generatedWords.at(-2)?.replace(/[ \n]$/, ""),
          generator,
        );
        if (version !== generation || disposed) return;
      }
      if (generator.areAllWordsGenerated()) {
        const generatedWords = session.getWords();
        const last = generatedWords.length - 1;
        generatedWords[last] =
          generatedWords[last]?.replace(/[ \n]$/, "") ?? "";
        session.setWords(generatedWords);
      }
    }
    refresh();
    const burst =
      session.getActiveWordIndex() > wordIndex
        ? getWordBurst(session.buildEventLog(), wordIndex, timestamp)
        : undefined;
    setStats((previous) => ({
      ...previous,
      acc: session.liveCache.getLiveCachedAccuracy(),
      burst:
        burst !== undefined && Number.isFinite(burst) ? burst : previous.burst,
    }));
    if (status() !== "finished") startTimer();
  }
  async function restart(repeat = false, quick = false): Promise<void> {
    if (session?.isActive()) {
      if (
        quick &&
        !canQuickRestart(
          config().mode,
          config().words,
          config().time,
          customText,
          customText.text.join(" ").length >= 10000,
        )
      ) {
        setNotice(
          "Quick restart disabled in long tests; use shift + restart key",
        );
        return;
      }
      repeat ||=
        repeated ||
        (config().mode === "quote" && store.config.repeatQuotes === "typing");
      abandoning = true;
      session.finish(now());
      abandoning = false;
      const log = session.buildEventLog();
      if (store.config.resultSaving) {
        incompleteTests.push({
          acc: getAccuracy(log).percentage,
          seconds: getIncompleteTestSeconds(log),
        });
      }
      restartCount++;
    }
    await load(repeat);
  }
  function finish(timestamp = now()): void {
    if (!session?.isActive()) return;
    bailedOut = config().mode !== "zen";
    session.finish(timestamp);
  }
  function cancel(): void {
    stopTimer();
    paceState = null;
    setPace(undefined);
    generation++;
    session?.reset();
    if (!disposed && session !== undefined) {
      setStats(emptyStats());
      refresh();
      if (status() === "running") setStatus("ready");
    }
  }
  onCleanup(() => {
    disposed = true;
    stopTimer();
    generation++;
  });
  const ready = load();
  return {
    status,
    notice,
    words,
    activeIndex,
    revision,
    config,
    stats,
    result,
    customText,
    ready,
    inputFor: (index) => {
      revision();
      return session?.recorder.getInputForWord(index) ?? "";
    },
    sectionIndex: () => {
      revision();
      return sectionIndexes[activeIndex()];
    },
    insert,
    advance,
    pace,
    finish,
    restart,
    cancel,
    session: () => session,
    handleKey: async (event, timestamp = now()) => {
      const action = inputAction(event, config(), words());
      if (action === undefined) return Promise.resolve();
      event.preventDefault();
      const version = generation;
      pending = pending
        .then(async () => {
          if (disposed || version !== generation) return undefined;
          if (action.type === "restart") {
            await restart(false, !event.shift);
            return undefined;
          }
          if (action.type === "repeat") {
            await restart(true);
            return undefined;
          }
          if (action.type === "finish") {
            finish(timestamp);
            return undefined;
          }
          if (status() !== "ready" && status() !== "running") return undefined;
          if (event.eventType === "release") {
            if (event.source === "kitty") {
              session.record("keyup", timestamp, keyData(event));
            }
            return undefined;
          }
          session.record("keydown", timestamp, keyData(event));
          if (action.type === "insert") {
            await insert(action.text, timestamp);
          } else {
            session.delete(action.inputType, timestamp);
            refresh();
          }
          if (action.type === "delete") {
            setStats((previous) => ({
              ...previous,
              acc: session.liveCache.getLiveCachedAccuracy(),
            }));
          }
          return undefined;
        })
        .catch((error: unknown) => {
          stopTimer();
          setNotice(error instanceof Error ? error.message : "Input failed");
          setStatus("error");
        });
      return pending;
    },
  };
}

export const TypingTestContext = createContext<TypingTest>();
export function useTypingTest(): TypingTest {
  const test = useContext(TypingTestContext);
  if (test === undefined) {
    throw new Error("useTypingTest outside TypingTestContext");
  }
  return test;
}
