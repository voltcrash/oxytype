import { usePaste, useTerminalDimensions } from "@opentui/solid";
import { splitIntoCharacters } from "@oxytype/typing-core/strings";
import {
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  Show,
} from "solid-js";

import { useConfig } from "../config/store";
import { useRouter } from "../router/router";
import { useScreenKeys } from "../shell/screen-keys";
import { Keymap } from "../test/keymap";
import { caretSlot, layoutWords, lineWindow, tapeWindow } from "../test/layout";
import { LiveStatsBar } from "../test/live-stats";
import { changeAmount, cycleMode, ModeBar } from "../test/mode-bar";
import { useTypingTest } from "../test/typing-test";
import { buildWordView } from "../test/word-view";
import { Words } from "../test/words";
import { useTheme } from "../theme/theme";
import { KeyHints, type Hint } from "../ui/key-hints";

/** Web-like three lines of words, unless all lines are shown. */
const visibleLines = 3;
/** A comfortable measure when max line width is unset. */
const defaultLineWidth = 80;

export function TestScreen() {
  const router = useRouter();
  const theme = useTheme();
  const store = useConfig();
  const test = useTypingTest();
  const dimensions = useTerminalDimensions();
  const [memoryRemaining, setMemoryRemaining] = createSignal(0);
  createEffect(() => {
    if (!test.config().funbox.includes("memory") || test.status() !== "ready") {
      setMemoryRemaining(0);
      return;
    }
    const duration = Math.round(test.words().length ** 1.2);
    const deadline = performance.now() + duration * 1000;
    setMemoryRemaining(duration);
    const timer = setInterval(
      () =>
        setMemoryRemaining(
          Math.max(0, Math.ceil((deadline - performance.now()) / 1000)),
        ),
      1000,
    );
    onCleanup(() => clearInterval(timer));
  });
  const shownConfig = (): typeof store.config =>
    test.status() === "running" ||
    test.challenge() !== undefined ||
    test.practice()
      ? test.config()
      : store.config;
  const tape = (): boolean => store.config.tapeMode !== "off";
  const running = (): boolean => test.status() === "running";
  /** Shell column minus its side padding and the caret's spare cell. */
  const available = (): number =>
    Math.max(
      1,
      Math.min(dimensions().width, 120 + (dimensions().width >= 100 ? 6 : 2)) -
        (dimensions().width >= 100 ? 6 : 2) -
        (store.config.showAllLines ? 2 : 1),
    );
  /** Columns for words: a readable measure unless max line width says otherwise. */
  const lineWidth = (): number =>
    Math.min(
      available(),
      store.config.maxLineWidth > 0
        ? store.config.maxLineWidth
        : defaultLineWidth,
    );
  const fullLayout = createMemo(() =>
    layoutWords(
      test.words().map((word, index) =>
        buildWordView(word, test.inputFor(index), {
          ...store.config,
          zen: test.config().mode === "zen",
          committed: index < test.activeIndex(),
        }),
      ),
      lineWidth(),
      { tape: tape() },
    ),
  );
  const typedLetters = (): number =>
    splitIntoCharacters(test.inputFor(test.activeIndex()).replace(/[ \n]$/, ""))
      .length;
  const layout = createMemo(() => {
    if (!tape()) return fullLayout();
    const word = fullLayout().slots[test.activeIndex()];
    const anchor =
      store.config.tapeMode === "word"
        ? (word?.[0]?.column ?? 0)
        : (caretSlot(fullLayout(), test.activeIndex(), typedLetters())
            ?.column ?? 0);
    return tapeWindow(
      fullLayout(),
      anchor,
      lineWidth(),
      store.config.tapeMargin,
    );
  });
  const caret = createMemo(() =>
    caretSlot(layout(), test.activeIndex(), typedLetters()),
  );
  const window = createMemo(() => {
    if (tape()) return { start: 0, end: 1 };
    const view = lineWindow(
      layout().lines.length,
      caret()?.line ?? 0,
      store.config.showAllLines,
    );
    const count = Math.max(
      1,
      Math.min(visibleLines, Math.floor((dimensions().height - 12) / 2)),
    );
    if (store.config.showAllLines) return view;
    const start = Math.max(view.start, (caret()?.line ?? 0) - count + 1);
    return { start, end: Math.min(view.end, start + count) };
  });
  const pace = createMemo(() => {
    const position = test.pace();
    return position === undefined
      ? undefined
      : caretSlot(layout(), position.wordIndex, position.letterIndex);
  });
  const customLabel = (): string =>
    test.customText.limit.value === 0
      ? "unlimited"
      : `${test.customText.limit.value} ${test.customText.limit.mode}`;
  const hints = (): Hint[] => [
    { key: "^r", label: "restart" },
    { key: "F7", label: "repeat" },
    { key: "F8", label: "finish" },
    { key: "F2", label: "mode" },
    { key: "F3", label: "punct" },
    { key: "F4", label: "numbers" },
    { key: "F5/F6", label: "length" },
    ...(store.config.mode === "custom"
      ? [{ key: "F9", label: "limit type" }]
      : []),
  ];
  createEffect(() => {
    if (test.status() === "finished") router.replace("result");
  });
  onCleanup(() => {
    if (test.status() === "running") test.cancel();
  });
  usePaste((event) => {
    event.preventDefault();
  });
  useScreenKeys((event) => {
    if (event.eventType === "release") {
      void test.handleKey(event);
      return;
    }
    if (
      ["f2", "f3", "f4", "f5", "f6", "f9"].includes(event.name) &&
      !test.canInterrupt()
    ) {
      event.preventDefault();
      return;
    }
    if (event.name === "f2") {
      event.preventDefault();
      store.set("mode", cycleMode(store.config));
    } else if (event.name === "f3") {
      event.preventDefault();
      store.set("punctuation", !store.config.punctuation);
    } else if (event.name === "f4") {
      event.preventDefault();
      store.set("numbers", !store.config.numbers);
    } else if (event.name === "f5" || event.name === "f6") {
      event.preventDefault();
      const step = event.name === "f5" ? -1 : 1;
      if (store.config.mode === "custom") {
        const limit = test.customText.limit;
        const values =
          limit.mode === "time"
            ? [15, 30, 60, 120, 0]
            : limit.mode === "section"
              ? [1, 3, 5, 10, 0]
              : [10, 25, 50, 100, 0];
        limit.value =
          values[
            (values.indexOf(limit.value) + step + values.length) % values.length
          ] ?? 10;
        test.clearChallenge();
        void test.restart();
      } else {
        changeAmount(store, step);
      }
    } else if (event.name === "f9" && store.config.mode === "custom") {
      event.preventDefault();
      const limit = test.customText.limit;
      limit.mode =
        limit.mode === "word"
          ? "time"
          : limit.mode === "time"
            ? "section"
            : "word";
      limit.value =
        limit.mode === "time" ? 30 : limit.mode === "section" ? 1 : 10;
      test.clearChallenge();
      void test.restart();
    } else {
      void test.handleKey(event);
    }
  });
  return (
    <box
      flexDirection="column"
      width="100%"
      flexGrow={1}
      alignItems="center"
      paddingBottom={1}
    >
      <Show when={!running()} fallback={<text> </text>}>
        <ModeBar
          config={shownConfig()}
          customLabel={customLabel()}
          compact={dimensions().width < 100}
        />
      </Show>
      <box flexGrow={1} minHeight={1} />
      <box flexDirection="column" width={lineWidth() + 1} flexShrink={0}>
        <box flexDirection="row" flexShrink={0}>
          <LiveStatsBar width={lineWidth()} />
          <box flexGrow={1} />
          <Show when={!running()}>
            <text fg={theme().colors.sub} flexShrink={0}>
              {test.config().language.replaceAll("_", " ")}
            </text>
          </Show>
        </box>
        <Show when={test.notice()}>
          {(notice) => (
            <text fg={theme().colors.error} wrapMode="word">
              {notice()}
            </text>
          )}
        </Show>
        <Show
          when={test.status() !== "loading"}
          fallback={<text fg={theme().colors.sub}>loading words…</text>}
        >
          <Show
            when={
              test.config().funbox.includes("memory") &&
              test.status() === "ready"
            }
          >
            <text fg={theme().colors.main}>
              memorize · {memoryRemaining()}s
            </text>
          </Show>
          <box height={1} flexShrink={0} />
          <Words
            layout={layout()}
            funboxes={test.config().funbox}
            memoryHidden={memoryRemaining() === 0}
            activeIndex={test.activeIndex()}
            window={window()}
            pace={pace()}
            height={Math.min(
              (window().end - window().start) * 2,
              Math.max(2, dimensions().height - 12),
            )}
            caret={
              test.status() === "ready" || test.status() === "running"
                ? caret()
                : undefined
            }
          />
        </Show>
      </box>
      <box flexGrow={1} minHeight={1} />
      <Keymap />
      <Show when={!running()} fallback={<text> </text>}>
        <KeyHints hints={hints()} wrap />
      </Show>
    </box>
  );
}
