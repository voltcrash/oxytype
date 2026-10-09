import type { RGBA } from "@opentui/core";

import { createMemo, For, Show } from "solid-js";

import type { FinishedTest } from "../test/typing-test";
import type { TerminalTheme } from "../theme/theme";
import type { Chunk } from "../ui/styled";
import type { PlotCell } from "./plot";

import { useTheme } from "../theme/theme";
import { StyledLine } from "../ui/styled";
import { braillePlot, errorColumns } from "./plot";

const blocks = "▁▂▃▄▅▆▇█";
/** Bucket long histories into terminal columns. Error spikes use their maximum. */
export function sparkline(
  values: readonly number[],
  width: number,
  maximum: number,
  peaks = false,
  minimum = 0,
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
        Math.min(
          7,
          Math.max(
            0,
            Math.round(
              ((value - minimum) / Math.max(1, maximum - minimum)) * 7,
            ),
          ),
        )
      ] ?? "▁"
    );
  }).join("");
}
export type ChartSeries = {
  label: string;
  values: readonly number[];
  color: RGBA;
};

/** Labelled braille line chart with an error strip and a time axis. */
export function LineChart(props: {
  series: readonly ChartSeries[];
  errors?: readonly number[];
  width: number;
  height: number;
  minimum: number;
  maximum: number;
  duration: number;
}) {
  const theme = useTheme();
  const colors = (): TerminalTheme["colors"] => theme().colors;
  const axis = (): number =>
    Math.max(String(Math.ceil(props.maximum)).length, 2) + 1;
  const plotWidth = (): number => Math.max(1, props.width - axis());
  const rows = createMemo(() =>
    braillePlot(
      props.series.map((it) => it.values),
      plotWidth(),
      props.height,
      props.minimum,
      props.maximum,
    ),
  );
  const label = (row: number): string => {
    const text =
      row === 0
        ? String(Math.ceil(props.maximum))
        : row === props.height - 1
          ? String(props.minimum)
          : "";
    return `${text.padStart(axis() - 1)} `;
  };
  const plotLine = (cells: PlotCell[], row: number): Chunk[] => {
    const chunks: Chunk[] = [{ text: label(row), fg: colors().sub }];
    for (const cell of cells) {
      const fg =
        cell.series === undefined
          ? colors().sub
          : (props.series[cell.series]?.color ?? colors().sub);
      const last = chunks.at(-1);
      if (chunks.length > 1 && last?.fg === fg) last.text += cell.char;
      else chunks.push({ text: cell.char, fg });
    }
    return chunks;
  };
  const errorLine = (): Chunk[] => [
    { text: " ".repeat(axis()) },
    {
      text: errorColumns(props.errors ?? [], plotWidth())
        .map((marked) => (marked ? "x" : " "))
        .join(""),
      fg: colors().error,
    },
  ];
  const timeLine = (): Chunk[] => {
    const end = `${props.duration.toFixed(1)}s`;
    return [
      {
        text: `${" ".repeat(axis())}0s${end.padStart(plotWidth() - 2)}`,
        fg: colors().sub,
      },
    ];
  };
  const legend = (): Chunk[] => [
    { text: " ".repeat(axis()) },
    ...props.series.flatMap((it, index): Chunk[] => [
      ...(index === 0 ? [] : [{ text: "   " }]),
      { text: "── ", fg: it.color },
      { text: it.label, fg: colors().sub },
    ]),
    ...(props.errors === undefined
      ? []
      : [
          { text: "   " },
          { text: "x ", fg: colors().error },
          { text: "errors", fg: colors().sub },
        ]),
  ];
  return (
    <box flexDirection="column" flexShrink={0}>
      <StyledLine chunks={legend()} />
      <For each={rows()}>
        {(cells, row) => <StyledLine chunks={plotLine(cells, row())} />}
      </For>
      <Show when={props.errors !== undefined}>
        <StyledLine chunks={errorLine()} />
      </Show>
      <StyledLine chunks={timeLine()} />
    </box>
  );
}

export function ResultChart(props: {
  test: FinishedTest;
  width: number;
  height?: number;
  startAtZero?: boolean;
}) {
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
  const minimum = (): number =>
    props.startAtZero === false
      ? Math.floor(Math.min(...wpm(), ...props.test.rawHistory, maximum()))
      : 0;
  return (
    <LineChart
      series={[
        {
          label: "raw",
          values: props.test.rawHistory,
          color: theme().colors.sub,
        },
        { label: "wpm", values: wpm(), color: theme().colors.main },
      ]}
      errors={errors()}
      width={props.width}
      height={props.height ?? 6}
      minimum={minimum()}
      maximum={maximum()}
      duration={props.test.result.testDuration}
    />
  );
}
