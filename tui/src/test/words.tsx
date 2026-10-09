import type {
  BoxRenderable,
  ScrollBoxRenderable,
  RGBA,
  TextChunk,
  TextRenderable,
} from "@opentui/core";

import { StyledText, TextAttributes } from "@opentui/core";
import { useRenderer } from "@opentui/solid";
import { createEffect, createMemo, Index, onCleanup, Show } from "solid-js";

import type { TerminalTheme } from "../theme/theme";
import type { Cell, LineWindow, Position, WordsLayout } from "./layout";
import type { LetterColorConfig } from "./letter-colors";

import { useConfig } from "../config/store";
import { useTheme } from "../theme/theme";
import { terminalCaretStyle } from "./caret";
import { cellColor } from "./letter-colors";

export type WordsProps = {
  layout: WordsLayout;
  window: LineWindow;
  caret?: Position;
  pace?: Position;
  height?: number;
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
  const renderer = useRenderer();
  const theme = useTheme();
  const { config } = useConfig();
  let box!: BoxRenderable;
  let scroll!: ScrollBoxRenderable;
  const lines = createMemo(() =>
    props.layout.lines.slice(props.window.start, props.window.end),
  );
  const visiblePace = createMemo(
    () =>
      props.pace !== undefined &&
      config.paceCaretStyle !== "off" &&
      props.pace.line >= props.window.start &&
      props.pace.line < props.window.end,
  );

  const paintCaret = (): void => {
    const caret = props.caret;
    const row =
      caret === undefined ? -1 : (caret.line - props.window.start) * 2;
    const cursorY = box.y + row;
    const visible =
      config.caretStyle !== "off" &&
      row >= 0 &&
      cursorY >= scroll.viewport.y &&
      cursorY < scroll.viewport.y + scroll.viewport.height;
    renderer.setCursorStyle({
      style: terminalCaretStyle(config.caretStyle),
      blinking: false,
    });
    renderer.setCursorColor(theme().colors.caret);
    renderer.setCursorPosition(
      box.x + Math.min(caret?.column ?? 0, Math.max(0, box.width - 1)) + 1,
      box.y + Math.max(0, row) + 1,
      visible,
    );
  };
  const scrollToCaret = (): void => {
    if (scroll === undefined || !config.showAllLines) return;
    const requested = Math.max(
      0,
      ((props.caret?.line ?? 0) - props.window.start - 1) * 2,
    );
    const top = Math.min(
      requested,
      Math.max(0, scroll.scrollHeight - scroll.viewport.height),
    );
    if (top !== scroll.scrollTop) scroll.scrollTo(top);
  };
  onCleanup(() => renderer.setCursorPosition(0, 0, false));

  return (
    <scrollbox
      ref={(node) => {
        scroll = node;
      }}
      height={props.height ?? lines().length * 2}
      flexShrink={0}
      scrollX={false}
      verticalScrollbarOptions={{ visible: config.showAllLines }}
      renderBefore={() => scrollToCaret()}
    >
      <box
        ref={(node) => {
          box = node;
        }}
        flexDirection="column"
        gap={1}
        width="100%"
        flexShrink={0}
        height={lines().length * 2}
        renderAfter={() => paintCaret()}
      >
        <Index each={lines()}>{(cells) => <WordLine cells={cells()} />}</Index>
        <Show when={visiblePace()}>
          <text
            position="absolute"
            left={props.pace?.column ?? 0}
            top={((props.pace?.line ?? 0) - props.window.start) * 2 + 1}
            fg={theme().colors.sub}
          >
            {config.paceCaretStyle === "block" ||
            config.paceCaretStyle === "outline"
              ? "▣"
              : config.paceCaretStyle === "underline"
                ? "_"
                : "▏"}
          </text>
        </Show>
      </box>
    </scrollbox>
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
