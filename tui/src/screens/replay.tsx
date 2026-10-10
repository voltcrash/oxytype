import { useTerminalDimensions } from "@opentui/solid";
import { replayDuration, replayFrame } from "@oxytype/typing-core/replay";
import { splitIntoCharacters } from "@oxytype/typing-core/strings";
import { createMemo, createSignal, onCleanup, Show } from "solid-js";

import { useConfig } from "../config/store";
import { useScreenKeys } from "../shell/screen-keys";
import { caretSlot, layoutWords } from "../test/layout";
import { useTypingTest } from "../test/typing-test";
import { buildWordView } from "../test/word-view";
import { Words } from "../test/words";
import { useTheme } from "../theme/theme";
import { KeyHints, parseHints } from "../ui/key-hints";

export function ReplayScreen() {
  const test = useTypingTest();
  const { config } = useConfig();
  const theme = useTheme();
  const dimensions = useTerminalDimensions();
  const [position, setPosition] = createSignal(0);
  const [playing, setPlaying] = createSignal(false);
  const [speed, setSpeed] = createSignal(1);
  const log = () => test.result()?.eventLog;
  const duration = createMemo(() => {
    const value = log();
    return value === undefined ? 0 : replayDuration(value);
  });
  const frame = createMemo(() => {
    const value = log();
    return value === undefined
      ? { inputs: [], activeIndex: 0 }
      : replayFrame(value, position());
  });
  const targets = () => log()?.context.targetWords ?? [];
  const width = () => Math.max(1, dimensions().width - 4);
  const layout = createMemo(() => {
    const current = frame();
    const words = targets();
    const appearance = { ...config, blindMode: false };
    const zen = log()?.context.mode === "zen";
    return layoutWords(
      Array.from(
        { length: Math.max(1, words.length, current.inputs.length) },
        (_, index) =>
          buildWordView(words[index] ?? "", current.inputs[index] ?? "", {
            ...appearance,
            zen,
            committed: index < current.activeIndex,
          }),
      ),
      width(),
    );
  });
  const caret = () =>
    caretSlot(
      layout(),
      frame().activeIndex,
      splitIntoCharacters(
        (frame().inputs[frame().activeIndex] ?? "").replace(/[ \n]$/, ""),
      ).length,
    );
  const height = () => Math.max(1, Math.floor((dimensions().height - 12) / 2));
  const window = () => {
    const start = Math.max(0, (caret()?.line ?? 0) - height() + 1);
    return { start, end: Math.min(layout().lines.length, start + height()) };
  };
  let previous = performance.now();
  const timer = setInterval(() => {
    const now = performance.now();
    const elapsed = now - previous;
    previous = now;
    if (!playing()) return;
    const next = Math.min(duration(), position() + elapsed * speed());
    setPosition(next);
    if (next >= duration()) setPlaying(false);
  }, 50);
  onCleanup(() => clearInterval(timer));
  useScreenKeys((event) => {
    if (event.eventType === "release") return;
    if (event.ctrl || event.meta) return;
    if (event.name === "space" || event.name === "return") {
      event.preventDefault();
      if (position() >= duration()) setPosition(0);
      previous = performance.now();
      setPlaying((value) => !value);
    } else if (event.name === "left" || event.name === "right") {
      event.preventDefault();
      setPosition(
        Math.min(
          duration(),
          Math.max(0, position() + (event.name === "left" ? -1000 : 1000)),
        ),
      );
    } else if (event.name === "home" || event.name === "end") {
      event.preventDefault();
      setPlaying(false);
      setPosition(event.name === "home" ? 0 : duration());
    } else if (event.name === "s") {
      event.preventDefault();
      const speeds = [0.5, 1, 2, 4];
      setSpeed(speeds[(speeds.indexOf(speed()) + 1) % speeds.length] ?? 1);
    }
  });
  return (
    <box flexDirection="column" gap={1}>
      <text fg={theme().colors.main}>
        last test replay · {playing() ? "playing" : "paused"} · {speed()}×
      </text>
      <text fg={theme().colors.sub}>
        {(position() / 1000).toFixed(1)} / {(duration() / 1000).toFixed(1)}s
      </text>
      <Show
        when={log()}
        fallback={
          <text fg={theme().colors.sub}>finish a test to replay it</text>
        }
      >
        <Words
          layout={layout()}
          window={window()}
          activeIndex={frame().activeIndex}
          caret={caret()}
          height={(window().end - window().start) * 2}
        />
      </Show>
      <KeyHints
        wrap
        hints={parseHints(
          "space play/pause · ←→ seek 1s · home/end jump · s speed · esc back",
        )}
      />
    </box>
  );
}
