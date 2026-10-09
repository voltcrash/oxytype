import { useTerminalDimensions } from "@opentui/solid";
import { Formatting } from "@oxytype/typing-core/format";
import { For, Show } from "solid-js";

import { useConfig } from "../config/store";
import { ResultChart } from "../results/chart";
import { useHistory } from "../results/history";
import { useUploads } from "../results/upload";
import { useRouter } from "../router/router";
import { useScreenKeys } from "../shell/screen-keys";
import { useTypingTest, type FinishedTest } from "../test/typing-test";
import { useTheme } from "../theme/theme";
import { BigText, bigTextLines } from "../ui/big-text";
import { KeyHints, type Hint } from "../ui/key-hints";

type Stat = { label: string; value: string; detail?: string };

export function ResultScreen() {
  const router = useRouter();
  const theme = useTheme();
  const test = useTypingTest();
  const history = useHistory();
  const uploads = useUploads();
  const { config } = useConfig();
  const dimensions = useTerminalDimensions();
  const format = (): Formatting => new Formatting(config);
  const saveMessage = (): string => {
    const save = history.lastSave();
    if (save === undefined || save.result !== test.result()?.result) {
      return "result saving disabled";
    }
    if (save.state === "saving") return "saving locally…";
    if (save.state === "error") return "local save failed";
    return `saved locally${test.result()?.result.offline === true ? " · offline" : ""}`;
  };
  const next = (repeat = false): void => {
    void test.restart(repeat);
    router.replace("test");
  };
  useScreenKeys((event) => {
    if (event.eventType === "release") return;
    if (
      event.name === "return" ||
      (event.ctrl && event.name === "r") ||
      (event.name === "tab" && config.quickRestart === "tab") ||
      (event.name === "escape" && config.quickRestart === "esc")
    ) {
      event.preventDefault();
      next();
    } else if (event.name === "r" && !event.ctrl) {
      event.preventDefault();
      router.push("replay");
    } else if (event.name === "f7") {
      event.preventDefault();
      next(true);
    }
  });
  const showChart = (): boolean => dimensions().height >= 22;
  const columnWidth = (): number =>
    Math.min(dimensions().width, 126) - (dimensions().width >= 100 ? 6 : 2);
  const big = (finished: FinishedTest) => ({
    speed: format().typingSpeed(finished.result.wpm),
    accuracy: format().accuracy(finished.result.acc),
  });
  const bigWidth = (finished: FinishedTest): number =>
    Math.max(
      bigTextLines(big(finished).speed)[0].length,
      bigTextLines(big(finished).accuracy)[0].length,
      config.typingSpeedUnit.length,
    );
  const stats = (finished: FinishedTest): Stat[] => [
    {
      label: "test type",
      value: `${finished.result.mode} ${finished.result.mode2}`.trim(),
      detail: finished.result.language.replaceAll("_", " "),
    },
    { label: "raw", value: format().typingSpeed(finished.result.rawWpm) },
    {
      label: "characters",
      value: finished.result.charStats.join("/"),
      detail: "correct/incorrect/extra/missed",
    },
    {
      label: "consistency",
      value: format().percentage(finished.result.consistency),
    },
    { label: "time", value: `${finished.result.testDuration.toFixed(2)}s` },
  ];
  const hints: Hint[] = [
    { key: "enter", label: "next test" },
    { key: "F7", label: "repeat" },
    { key: "r", label: "replay" },
    { key: "^o", label: "history" },
  ];
  return (
    <box flexDirection="column" width="100%" flexGrow={1} paddingBottom={1}>
      <Show
        when={test.result()}
        fallback={
          <text fg={theme().colors.sub}>complete a test to see results</text>
        }
      >
        {(finished) => (
          <box flexDirection="column" gap={1} flexShrink={0}>
            <box flexDirection="row" gap={4} flexShrink={0}>
              <box
                flexDirection={showChart() ? "column" : "row"}
                gap={showChart() ? 0 : 4}
                flexShrink={0}
              >
                <box flexDirection="column" flexShrink={0}>
                  <text fg={theme().colors.sub}>{config.typingSpeedUnit}</text>
                  <BigText
                    text={big(finished()).speed}
                    fg={theme().colors.main}
                  />
                </box>
                <Show when={showChart()}>
                  <text> </text>
                </Show>
                <box flexDirection="column" flexShrink={0}>
                  <text fg={theme().colors.sub}>acc</text>
                  <BigText
                    text={big(finished()).accuracy}
                    fg={theme().colors.main}
                  />
                </box>
              </box>
              <Show when={showChart()}>
                <ResultChart
                  test={finished()}
                  width={columnWidth() - bigWidth(finished()) - 4}
                  height={dimensions().height >= 32 ? 8 : 6}
                  startAtZero={config.startGraphsAtZero}
                />
              </Show>
            </box>
            <box flexDirection="row" gap={4} flexShrink={0} flexWrap="wrap">
              <For each={stats(finished())}>
                {(stat) => (
                  <box flexDirection="column" flexShrink={0}>
                    <text fg={theme().colors.sub}>{stat.label}</text>
                    <text fg={theme().colors.text}>{stat.value}</text>
                    <Show
                      when={
                        stat.detail !== undefined && stat.label !== "characters"
                      }
                    >
                      <text fg={theme().colors.sub}>{stat.detail}</text>
                    </Show>
                  </box>
                )}
              </For>
            </box>
            <box flexDirection="column" flexShrink={0}>
              <Show when={finished().challengeMessage}>
                <text fg={theme().colors.main}>
                  {finished().challengeMessage}
                </text>
              </Show>
              <Show when={finished().invalid}>
                <text fg={theme().colors.error}>
                  not saved: {finished().failure ?? finished().invalid}
                </text>
              </Show>
              <Show when={finished().invalid === undefined}>
                <text fg={theme().colors.sub}>{saveMessage()}</text>
                <Show when={uploads?.last()?.result === finished().result}>
                  <text
                    fg={
                      uploads?.last()?.state === "error"
                        ? theme().colors.error
                        : theme().colors.main
                    }
                  >
                    {uploads?.last()?.message}
                    {uploads?.last()?.isPb === true ? " · new TUI PB" : ""}
                  </text>
                </Show>
              </Show>
              <Show when={history.notice()}>
                {(notice) => <text fg={theme().colors.error}>{notice()}</text>}
              </Show>
            </box>
          </box>
        )}
      </Show>
      <box flexGrow={1} />
      <KeyHints hints={hints} />
    </box>
  );
}
