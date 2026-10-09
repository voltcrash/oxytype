import type { FinishedTest } from "../test/typing-test";

import { useTheme } from "../theme/theme";

const blocks = "▁▂▃▄▅▆▇█";
/** Bucket long histories into terminal columns. Error spikes use their maximum. */
export function sparkline(
  values: readonly number[],
  width: number,
  maximum: number,
  peaks = false,
): string {
  if (values.length === 0) return "no samples";
  const columns = Math.max(1, Math.min(Math.floor(width), values.length));
  return Array.from({ length: columns }, (_, column) => {
    const start = Math.floor((column * values.length) / columns);
    const end = Math.floor(((column + 1) * values.length) / columns);
    const bucket = values.slice(start, end);
    const value = peaks
      ? Math.max(...bucket)
      : bucket.reduce((sum, sample) => sum + sample, 0) / bucket.length;
    return (
      blocks[
        Math.min(7, Math.max(0, Math.round((value / Math.max(1, maximum)) * 7)))
      ] ?? "▁"
    );
  }).join("");
}
export function ResultChart(props: { test: FinishedTest; width: number }) {
  const theme = useTheme();
  const wpm = (): number[] =>
    props.test.result.chartData === "toolong"
      ? []
      : props.test.result.chartData.wpm;
  const errors = (): number[] =>
    props.test.result.chartData === "toolong"
      ? []
      : props.test.result.chartData.err;
  const maximum = (): number => Math.max(1, ...wpm(), ...props.test.rawHistory);
  return (
    <box flexDirection="column" flexShrink={0}>
      <text fg={theme().colors.main}>
        wpm {sparkline(wpm(), props.width - 10, maximum())}
      </text>
      <text fg={theme().colors.sub}>
        raw {sparkline(props.test.rawHistory, props.width - 10, maximum())}
      </text>
      <text fg={theme().colors.error}>
        err{" "}
        {sparkline(errors(), props.width - 10, Math.max(1, ...errors()), true)}
      </text>
      <text fg={theme().colors.sub}>
        0s → {props.test.result.testDuration.toFixed(1)}s · speed 0–
        {Math.ceil(maximum())}
      </text>
    </box>
  );
}
