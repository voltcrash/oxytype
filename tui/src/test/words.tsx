import type { RGBA, TextChunk, TextRenderable } from "@opentui/core";

import { StyledText, TextAttributes } from "@opentui/core";
import { createEffect, createMemo, Index } from "solid-js";

import type { TerminalTheme } from "../theme/theme";
import type { Cell, LineWindow, WordsLayout } from "./layout";
import type { LetterColorConfig } from "./letter-colors";

import { useConfig } from "../config/store";
import { useTheme } from "../theme/theme";
import { cellColor } from "./letter-colors";

export type WordsProps = {
  layout: WordsLayout;
  window: LineWindow;
};

type CellStyle = { fg: RGBA; attributes: number };

function cellStyle(
  cell: Cell,
  colors: TerminalTheme["colors"],
  config: LetterColorConfig,
): CellStyle {
  return {
    fg: cellColor(cell.kind, colors, config),
    // Terminals cannot colour underlines separately; the letter colour shows.
    attributes: cell.error ? TextAttributes.UNDERLINE : TextAttributes.NONE,
  };
}

/** One chunk per run of equally styled cells. */
function lineContent(
  cells: Cell[],
  colors: TerminalTheme["colors"],
  config: LetterColorConfig,
): StyledText {
  const chunks: TextChunk[] = [];
  for (const cell of cells) {
    const style = cellStyle(cell, colors, config);
    const last = chunks.at(-1);
    if (last?.fg === style.fg && last.attributes === style.attributes) {
      last.text += cell.char;
    } else {
      chunks.push({ __isChunk: true, text: cell.char, ...style });
    }
  }
  return new StyledText(chunks);
}

export function Words(props: WordsProps) {
  const lines = createMemo(() =>
    props.layout.lines.slice(props.window.start, props.window.end),
  );

  return (
    <box flexDirection="column" gap={1}>
      <Index each={lines()}>{(cells) => <WordLine cells={cells()} />}</Index>
    </box>
  );
}

function WordLine(props: { cells: Cell[] }) {
  const theme = useTheme();
  const { config } = useConfig();
  let line!: TextRenderable;
  // OpenTUI Solid 0.5 converts the JSX content prop to a string.
  createEffect(() => {
    line.content = lineContent(props.cells, theme().colors, config);
  });
  return (
    <text
      ref={(node) => {
        line = node;
      }}
      wrapMode="none"
      height={1}
      flexShrink={0}
    />
  );
}
