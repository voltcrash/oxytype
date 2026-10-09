import type {
  BoxRenderable,
  ScrollBoxRenderable,
  RGBA,
  TextChunk,
  TextRenderable,
} from "@opentui/core";
import type { Config } from "@oxytype/schemas/configs";

import { StyledText, TextAttributes } from "@opentui/core";
import { useRenderer } from "@opentui/solid";
import { createEffect, createMemo, Index, onCleanup, Show } from "solid-js";

import type { TerminalTheme } from "../theme/theme";
import type { Cell, LineWindow, Position, WordsLayout } from "./layout";
import type { LetterColorConfig, WordContext } from "./letter-colors";

import { useConfig } from "../config/store";
import { useTheme } from "../theme/theme";
import { terminalCaretStyle } from "./caret";
import { cellColor, typedEffectCell } from "./letter-colors";
import { hideWord } from "./visibility";

export type WordsProps = {
  layout: WordsLayout;
  /** Drives word highlighting and typed effects. */
  activeIndex?: number;
  window: LineWindow;
  caret?: Position;
  pace?: Position;
  height?: number;
  funboxes?: Config["funbox"];
  memoryHidden?: boolean;
};

type CellStyle = { char: string; fg: RGBA; attributes: number };
type StyleConfig = LetterColorConfig & Pick<Config, "typedEffect">;

function cellStyle(
  cell: Cell,
  colors: TerminalTheme["colors"],
  config: StyleConfig,
  words?: WordContext,
): CellStyle {
  const typed =
    words !== undefined && cell.wordIndex < words.activeIndex
      ? typedEffectCell(cell, colors, config)
      : undefined;
  if (typed !== undefined) {
    return {
      char: typed.char,
      fg: typed.fg ?? colors.sub,
      attributes: TextAttributes.NONE,
    };
  }
  return {
    char: cell.char,
    fg: cellColor(cell, colors, config, words),
    // Terminals cannot colour underlines separately; the letter colour shows.
    attributes: cell.error ? TextAttributes.UNDERLINE : TextAttributes.NONE,
  };
}

/** One chunk per run of equally styled cells. */
function lineContent(
  cells: Cell[],
  colors: TerminalTheme["colors"],
  config: StyleConfig,
  words?: WordContext,
  funboxes: Config["funbox"] = [],
  memoryHidden = false,
): StyledText {
  const chunks: TextChunk[] = [];
  for (const cell of cells) {
    const style = hideWord(
      funboxes,
      cell.wordIndex,
      words?.activeIndex ?? 0,
      cell.kind === "untyped",
      memoryHidden,
    )
      ? {
          char: " ".repeat(cell.width),
          fg: colors.bg,
          attributes: TextAttributes.NONE,
        }
      : cellStyle(cell, colors, config, words);
    const last = chunks.at(-1);
    if (last?.fg === style.fg && last.attributes === style.attributes) {
      last.text += style.char;
    } else {
      chunks.push({
        __isChunk: true,
        text: style.char,
        fg: style.fg,
        attributes: style.attributes,
      });
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
  const errors = createMemo(() => {
    const words = new Set<number>();
    for (const line of props.layout.lines) {
      for (const cell of line) {
        if (cell.error || cell.kind === "incorrect" || cell.kind === "extra") {
          words.add(cell.wordIndex);
        }
      }
    }
    return words;
  });
  const wordContext = (): WordContext | undefined =>
    props.activeIndex === undefined
      ? undefined
      : {
          activeIndex: props.activeIndex,
          hasError: (index) => errors().has(index),
        };
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
        <Index each={lines()}>
          {(cells) => (
            <WordLine
              cells={cells()}
              words={wordContext()}
              funboxes={props.funboxes}
              memoryHidden={props.memoryHidden}
            />
          )}
        </Index>
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

function WordLine(props: {
  cells: Cell[];
  words?: WordContext;
  funboxes?: Config["funbox"];
  memoryHidden?: boolean;
}) {
  const theme = useTheme();
  const { config } = useConfig();
  let line!: TextRenderable;
  // OpenTUI Solid 0.5 converts the JSX content prop to a string.
  createEffect(() => {
    line.content = lineContent(
      props.cells,
      theme().colors,
      config,
      props.words,
      props.funboxes,
      props.memoryHidden,
    );
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
