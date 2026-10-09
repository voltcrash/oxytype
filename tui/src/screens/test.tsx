import { usePaste, useTerminalDimensions } from "@opentui/solid";
import { splitIntoCharacters } from "@oxytype/typing-core/strings";
import { createEffect, createMemo, onCleanup, Show, untrack } from "solid-js";

import { useConfig } from "../config/store";
import { useRouter } from "../router/router";
import { useScreenKeys } from "../shell/screen-keys";
import { caretSlot, layoutWords, lineWindow, tapeWindow } from "../test/layout";
import { LiveStatsBar } from "../test/live-stats";
import { changeAmount, cycleMode, ModeBar } from "../test/mode-bar";
import { useTypingTest } from "../test/typing-test";
import { buildWordView } from "../test/word-view";
import { Words } from "../test/words";
import { useTheme } from "../theme/theme";

export function TestScreen() {
  const router = useRouter();
  const theme = useTheme();
  const store = useConfig();
  const test = useTypingTest();
  const dimensions = useTerminalDimensions();
  const shownConfig = (): typeof store.config =>
    test.status() === "running" ? test.config() : store.config;
  const tape = (): boolean => store.config.tapeMode !== "off";
  /** Columns for words: the terminal width, capped by max line width. */
  const lineWidth = (): number => {
    const available = Math.max(
      1,
      dimensions().width - (store.config.showAllLines ? 4 : 3),
    );
    return store.config.maxLineWidth > 0
      ? Math.min(available, store.config.maxLineWidth)
      : available;
  };
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
    const count = Math.max(1, Math.floor((dimensions().height - 12) / 2));
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
  const amount = (): string => {
    const config = shownConfig();
    if (config.mode === "time") {
      return config.time === 0 ? "unlimited time" : `${config.time}s`;
    }
    if (config.mode === "words") {
      return config.words === 0 ? "unlimited words" : `${config.words} words`;
    }
    if (config.mode === "custom") {
      return `${test.customText.limit.value} ${test.customText.limit.mode} · default custom text`;
    }
    return config.mode;
  };
  const signature = createMemo(() =>
    JSON.stringify([
      store.config.mode,
      store.config.time,
      store.config.words,
      store.config.language,
      store.config.quoteLength,
      store.config.punctuation,
      store.config.numbers,
      store.config.lazyMode,
      store.config.britishEnglish,
      store.config.funbox,
    ]),
  );
  let previous = untrack(signature);
  let previousRemote = untrack(store.remoteRevision);
  createEffect(() => {
    const next = signature();
    const remote = store.remoteRevision();
    const fromServer = remote !== previousRemote;
    previousRemote = remote;
    if (next === previous) return;
    previous = next;
    if (fromServer && untrack(test.status) === "running") return;
    void test.restart();
  });
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
      void test.restart();
    } else {
      void test.handleKey(event);
    }
  });
  return (
    <box flexDirection="column" width="100%" gap={1}>
      <text fg={theme().colors.main}>typing test</text>
      <ModeBar config={shownConfig()} />
      <text fg={theme().colors.sub}>
        {amount()} · {test.config().language}
      </text>
      <LiveStatsBar />
      <Show when={test.notice()}>
        {(notice) => <text fg={theme().colors.error}>{notice()}</text>}
      </Show>
      <Show
        when={test.status() !== "loading"}
        fallback={<text fg={theme().colors.sub}>loading words…</text>}
      >
        <box
          paddingLeft={Math.max(
            0,
            Math.floor((dimensions().width - 3 - lineWidth()) / 2),
          )}
        >
          <Words
            layout={layout()}
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
        </box>
      </Show>
      <text fg={theme().colors.sub}>
        F2 mode · F3 punctuation · F4 numbers · F5/F6 amount
      </text>
      <Show when={store.config.mode === "custom"}>
        <text fg={theme().colors.sub}>F9 custom limit: word/time/section</text>
      </Show>
      <text fg={theme().colors.sub}>^r restart · F7 repeat · F8 finish</text>
    </box>
  );
}
