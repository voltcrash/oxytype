import { usePaste, useTerminalDimensions } from "@opentui/solid";
import { splitIntoCharacters } from "@oxytype/typing-core/strings";
import { createEffect, createMemo, onCleanup, Show, untrack } from "solid-js";

import { useConfig } from "../config/store";
import { useRouter } from "../router/router";
import { useScreenKeys } from "../shell/screen-keys";
import { caretSlot, layoutWords, lineWindow } from "../test/layout";
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
  const layout = createMemo(() =>
    layoutWords(
      test.words().map((word, index) =>
        buildWordView(word, test.inputFor(index), {
          ...store.config,
          zen: test.config().mode === "zen",
          committed: index < test.activeIndex(),
        }),
      ),
      Math.max(1, dimensions().width - 3),
    ),
  );
  const caret = createMemo(() =>
    caretSlot(
      layout(),
      test.activeIndex(),
      splitIntoCharacters(
        test.inputFor(test.activeIndex()).replace(/[ \n]$/, ""),
      ).length,
    ),
  );
  const window = createMemo(() => {
    const view = lineWindow(layout().lines.length, caret()?.line ?? 0, false);
    const count = Math.max(1, Math.floor((dimensions().height - 12) / 2));
    return { start: view.start, end: Math.min(view.end, view.start + count) };
  });
  const pace = createMemo(() => {
    const position = test.pace();
    return position === undefined
      ? undefined
      : caretSlot(layout(), position.wordIndex, position.letterIndex);
  });
  const amount = (): string => {
    if (store.config.mode === "time") {
      return store.config.time === 0
        ? "unlimited time"
        : `${store.config.time}s`;
    }
    if (store.config.mode === "words") {
      return store.config.words === 0
        ? "unlimited words"
        : `${store.config.words} words`;
    }
    if (store.config.mode === "custom") {
      return `${test.customText.limit.value} ${test.customText.limit.mode} · default custom text`;
    }
    return store.config.mode;
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
  createEffect(() => {
    const next = signature();
    if (next === previous) return;
    previous = next;
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
      changeAmount(store, event.name === "f5" ? -1 : 1);
    } else {
      void test.handleKey(event);
    }
  });
  return (
    <box flexDirection="column" width="100%" gap={1}>
      <text fg={theme().colors.main}>typing test</text>
      <ModeBar />
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
        <Words
          layout={layout()}
          window={window()}
          pace={pace()}
          caret={
            test.status() === "ready" || test.status() === "running"
              ? caret()
              : undefined
          }
        />
      </Show>
      <text fg={theme().colors.sub}>
        F2 mode · F3 punctuation · F4 numbers · F5/F6 amount
      </text>
      <text fg={theme().colors.sub}>^r restart · F7 repeat · F8 finish</text>
    </box>
  );
}
