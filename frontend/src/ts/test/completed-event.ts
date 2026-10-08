import { Config } from "@oxytype/schemas/configs";
import {
  CompletedEvent,
  CompletedEventCustomText,
  IncompleteTest,
} from "@oxytype/schemas/results";
import * as Numbers from "@oxytype/util/numbers";
import * as Strings from "../utils/strings";
import * as Misc from "../utils/misc";
import {
  calculateConsistency,
  calculateWpm,
} from "@oxytype/typing-core/stats-math";
import { EventLog } from "./events/types";
import {
  getAccuracy,
  getAfkDuration,
  getBurstHistory,
  getChars,
  getErrorCountHistory,
  getKeypressDurations,
  getKeypressOverlap,
  getKeypressSpacing,
  getLastKeypressToEndMs,
  getStartToFirstKeypressMs,
  getTestDurationMs,
  getWpmHistory,
} from "./events/stats";

/**
 * Everything the completed event needs that is not derived from the event log.
 */
export type CompletedEventContext = {
  config: Pick<
    Config,
    | "mode"
    | "time"
    | "words"
    | "language"
    | "punctuation"
    | "numbers"
    | "lazyMode"
    | "funbox"
    | "difficulty"
    | "blindMode"
    | "stopOnError"
  >;
  currentQuote: { id: number; group: number } | null;
  customText: CompletedEventCustomText | undefined;
  tags: string[];
  bailedOut: boolean;
  restartCount: number;
  incompleteTests: IncompleteTest[];
  incompleteSeconds: number;
  timestamp: number;
};

export function buildCompletedEvent(
  eventLog: EventLog,
  ctx: CompletedEventContext,
): Omit<CompletedEvent, "hash" | "uid"> {
  const { config, currentQuote } = ctx;
  const chars = getChars(eventLog);

  let language = config.language;
  if (config.mode === "quote") {
    language = Strings.removeLanguageSize(config.language);
  }

  const duration = getTestDurationMs(eventLog) / 1000;

  const rawPerSecond = getBurstHistory(eventLog);
  const afkDuration = getAfkDuration(eventLog);
  const consistency = calculateConsistency(rawPerSecond);

  const keypressSpacing = getKeypressSpacing(eventLog);
  // the last spacing leads into the test end, not into another key
  const keyConsistency = calculateConsistency(keypressSpacing.slice(0, -1));

  const wpmHistory = getWpmHistory(eventLog);
  const wpmConsistency = calculateConsistency(wpmHistory);

  const chartData = {
    wpm: wpmHistory,
    burst: rawPerSecond,
    err: getErrorCountHistory(eventLog),
  };

  const completedEvent: Omit<CompletedEvent, "hash" | "uid"> = {
    wpm: Numbers.roundTo2(calculateWpm(chars.correctWord, duration)),
    rawWpm: Numbers.roundTo2(
      calculateWpm(chars.allCorrect + chars.incorrect + chars.extra, duration),
    ),
    charStats: [chars.correctWord, chars.incorrect, chars.extra, chars.missed],
    charTotal: chars.allCorrect + chars.incorrect + chars.extra,
    acc: Numbers.roundTo2(getAccuracy(eventLog).percentage),
    language: language,
    testDuration: duration,
    lastKeyToEnd: getLastKeypressToEndMs(eventLog),
    startToFirstKey: getStartToFirstKeypressMs(eventLog),
    afkDuration: afkDuration,
    quoteLength: currentQuote?.group ?? -1,
    customText: ctx.customText,
    tags: ctx.tags,
    punctuation: config.punctuation,
    numbers: config.numbers,
    lazyMode: config.lazyMode,
    timestamp: ctx.timestamp,
    mode: config.mode,
    mode2: Misc.getMode2(config, currentQuote),
    bailedOut: ctx.bailedOut,
    funbox: config.funbox,
    difficulty: config.difficulty,
    blindMode: config.blindMode,
    stopOnLetter: config.stopOnError === "letter",
    restartCount: ctx.restartCount,
    incompleteTests: ctx.incompleteTests,
    incompleteTestSeconds:
      ctx.incompleteSeconds < 0 ? 0 : Numbers.roundTo2(ctx.incompleteSeconds),

    consistency: consistency,
    wpmConsistency: wpmConsistency,
    keyConsistency: keyConsistency,
    chartData: chartData,

    keySpacing: keypressSpacing,
    keyDuration: getKeypressDurations(eventLog),
    keyOverlap: getKeypressOverlap(eventLog),
  };

  if (completedEvent.mode !== "custom") delete completedEvent.customText;
  if (completedEvent.mode !== "quote") delete completedEvent.quoteLength;

  return completedEvent;
}
