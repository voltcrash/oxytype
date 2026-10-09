import { Formatting } from "@oxytype/typing-core/format";
import {
  getLiveAccText,
  getLiveBurstText,
  getLiveSpeedText,
  getTimerText,
  getWordsTotal,
  isTimerFlashHidden,
} from "@oxytype/typing-core/live-stats";
import { Show } from "solid-js";

import { useConfig } from "../config/store";
import { useTheme } from "../theme/theme";
import { useTypingTest } from "./typing-test";

export function LiveStatsBar() {
  const test = useTypingTest();
  const { config } = useConfig();
  const theme = useTheme();
  const format = (): Formatting => new Formatting(config);
  const timer = (): string =>
    getTimerText({
      config: test.config(),
      customLimit: test.customText.limit,
      seconds: test.stats().seconds,
      activeWordIndex: test.activeIndex(),
      wordCount: test.activeIndex(),
      wordsTotal: getWordsTotal({
        config: test.config(),
        customLimit: test.customText.limit,
        quoteLength:
          test.config().mode === "quote" ? test.words().length : undefined,
        wordsLength: test.words().length,
      }),
    });
  return (
    <box flexDirection="row" gap={3} height={1} flexShrink={0}>
      <Show
        when={
          config.timerStyle !== "off" &&
          !isTimerFlashHidden(
            config,
            test.customText.limit,
            test.stats().seconds,
          )
        }
      >
        <text fg={theme().colors.main}>{timer()}</text>
      </Show>
      <Show when={config.liveSpeedStyle !== "off"}>
        <text fg={theme().colors.main}>
          {getLiveSpeedText(format(), config.blindMode, test.stats())}{" "}
          {config.typingSpeedUnit}
        </text>
      </Show>
      <Show when={config.liveAccStyle !== "off"}>
        <text fg={theme().colors.sub}>
          {getLiveAccText(config.blindMode, test.stats())} acc
        </text>
      </Show>
      <Show when={config.liveBurstStyle !== "off"}>
        <text fg={theme().colors.sub}>
          {getLiveBurstText(format(), test.stats())} burst
        </text>
      </Show>
    </box>
  );
}
