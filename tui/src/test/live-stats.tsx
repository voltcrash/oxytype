import type { RGBA } from "@opentui/core";
import type { Config } from "@oxytype/schemas/configs";

import { useTerminalDimensions } from "@opentui/solid";
import { Formatting } from "@oxytype/typing-core/format";
import {
  getLiveAccText,
  getLiveBurstText,
  getLiveSpeedText,
  getCurrentWordCount,
  getTestTimeLimit,
  getTimerText,
  getWordsTotal,
  isTimeLimitedTest,
  isTimerFlashHidden,
} from "@oxytype/typing-core/live-stats";
import { Show } from "solid-js";

import type { TerminalTheme } from "../theme/theme";

import { useConfig } from "../config/store";
import { fade } from "../theme/color";
import { useTheme } from "../theme/theme";
import { useTypingTest } from "./typing-test";

/** The web's live stats colour and opacity, composited onto the background. */
export function liveStatsColor(
  colors: TerminalTheme["colors"],
  config: Pick<Config, "timerColor" | "timerOpacity">,
): RGBA {
  const color =
    config.timerColor === "black" ? undefined : colors[config.timerColor];
  return fade(color, colors.bg, Number(config.timerOpacity));
}

export function LiveStatsBar(props: { width?: number }) {
  const test = useTypingTest();
  const { config } = useConfig();
  const theme = useTheme();
  const dimensions = useTerminalDimensions();
  const format = (): Formatting => new Formatting(config);
  const color = (): RGBA => liveStatsColor(theme().colors, config);
  const wordCount = (): number =>
    getCurrentWordCount({
      mode: test.config().mode,
      customLimit: test.customText.limit,
      activeWordIndex: test.activeIndex(),
      getSectionIndex: test.sectionIndex,
    });
  const wordsTotal = (): number =>
    getWordsTotal({
      config: test.config(),
      customLimit: test.customText.limit,
      quoteLength:
        test.config().mode === "quote" ? test.words().length : undefined,
      wordsLength: test.words().length,
    });
  const timer = (): string =>
    getTimerText({
      config: test.config(),
      customLimit: test.customText.limit,
      seconds: test.stats().seconds,
      activeWordIndex: test.activeIndex(),
      wordCount: wordCount(),
      wordsTotal: wordsTotal(),
    });
  /** Like the web bar: time drains, word progress fills. */
  const progress = (): number => {
    const limitConfig = test.config();
    const customLimit = test.customText.limit;
    if (isTimeLimitedTest(limitConfig.mode, customLimit)) {
      const limit = getTestTimeLimit(limitConfig, customLimit);
      if (test.status() !== "running" || limit === 0) return 1;
      return Math.max(0, 1 - (test.stats().seconds + 1) / limit);
    }
    if (test.status() !== "running" || wordsTotal() === 0) return 0;
    return Math.min(1, wordCount() / wordsTotal());
  };
  const barWidth = (): number =>
    Math.max(1, props.width ?? dimensions().width - 2);
  return (
    <box flexDirection="column" flexShrink={0}>
      <Show when={config.timerStyle === "bar" && test.config().mode !== "zen"}>
        <text fg={color()} wrapMode="none">
          {"▀".repeat(Math.round(barWidth() * progress()))}
        </text>
      </Show>
      <box flexDirection="row" gap={3} height={1} flexShrink={0}>
        <Show
          when={
            config.timerStyle !== "off" &&
            config.timerStyle !== "bar" &&
            !isTimerFlashHidden(
              config,
              test.customText.limit,
              test.stats().seconds,
            )
          }
        >
          <text fg={color()}>{timer()}</text>
        </Show>
        <Show when={config.liveSpeedStyle !== "off"}>
          <text fg={color()}>
            {getLiveSpeedText(format(), config.blindMode, test.stats())}{" "}
            {config.typingSpeedUnit}
          </text>
        </Show>
        <Show when={config.liveAccStyle !== "off"}>
          <text fg={color()}>
            {getLiveAccText(config.blindMode, test.stats())} acc
          </text>
        </Show>
        <Show when={config.liveBurstStyle !== "off"}>
          <text fg={color()}>
            {getLiveBurstText(format(), test.stats())} burst
          </text>
        </Show>
      </box>
    </box>
  );
}
