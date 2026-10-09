import { useTerminalDimensions } from "@opentui/solid";
import { Formatting } from "@oxytype/typing-core/format";
import { Show } from "solid-js";

import { useConfig } from "../config/store";
import { ResultChart } from "../results/chart";
import { useHistory } from "../results/history";
import { useUploads } from "../results/upload";
import { useRouter } from "../router/router";
import { useScreenKeys } from "../shell/screen-keys";
import { useTypingTest } from "../test/typing-test";
import { useTheme } from "../theme/theme";

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
    return "saved locally · offline";
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
    } else if (event.name === "f7") {
      event.preventDefault();
      next(true);
    }
  });
  return (
    <box flexDirection="column" gap={1} width="100%">
      <text fg={theme().colors.main}>result</text>
      <Show
        when={test.result()}
        fallback={
          <text fg={theme().colors.sub}>complete a test to see results</text>
        }
      >
        {(finished) => (
          <>
            <text fg={theme().colors.main}>
              {format().typingSpeed(finished().result.wpm)}{" "}
              {config.typingSpeedUnit} ·{" "}
              {format().accuracy(finished().result.acc)} acc
            </text>
            <text fg={theme().colors.text}>
              raw {format().typingSpeed(finished().result.rawWpm)} · consistency{" "}
              {format().percentage(finished().result.consistency)}
            </text>
            <text fg={theme().colors.sub}>
              characters {finished().result.charStats.join("/")} ·
              correct/incorrect/extra/missed
            </text>
            <text fg={theme().colors.sub}>
              time {finished().result.testDuration.toFixed(2)}s ·{" "}
              {finished().result.mode} {finished().result.mode2} ·{" "}
              {finished().result.language}
            </text>
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
            <Show when={dimensions().height >= 22}>
              <ResultChart test={finished()} width={dimensions().width - 2} />
            </Show>
          </>
        )}
      </Show>
      <text fg={theme().colors.sub}>
        enter next test · F7 repeat · ^o history
      </text>
    </box>
  );
}
