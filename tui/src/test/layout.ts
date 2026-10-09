import type { LetterState, WordView } from "./word-view";

export type Cell = {
  char: string;
  /** Terminal columns; wide scripts take two. */
  width: number;
  /** `gap` separates words; `newline` marks a word that ends its line. */
  kind: LetterState | "gap" | "newline";
  wordIndex: number;
  /** Part of a committed word with errors. */
  error: boolean;
};

export type Position = { line: number; column: number };

export type WordsLayout = {
  lines: Cell[][];
  /** Per word: each letter's position, then the slot after the last letter. */
  slots: Position[][];
};

export type LineWindow = { start: number; end: number };

/** Lines visible while typing, like the web's three-line words box. */
export const visibleLineCount = 3;

export function charWidth(char: string): number {
  return Math.max(1, Bun.stringWidth(char));
}

/** Wraps words at spaces; words wider than a line break between letters. */
export function layoutWords(words: WordView[], width: number): WordsLayout {
  const lines: Cell[][] = [[]];
  const slots: Position[][] = [];
  let column = 0;

  const current = (): Cell[] => lines.at(-1) ?? [];
  const breakLine = (): void => {
    lines.push([]);
    column = 0;
  };

  words.forEach((word, wordIndex) => {
    const wordWidth = word.letters.reduce(
      (sum, letter) => sum + charWidth(letter.char),
      0,
    );
    if (column > 0) {
      if (column + 1 + wordWidth > width) {
        breakLine();
      } else {
        current().push(gapCell(wordIndex));
        column++;
      }
    }

    const wordSlots: Position[] = [];
    for (const letter of word.letters) {
      const cellWidth = charWidth(letter.char);
      if (column > 0 && column + cellWidth > width) breakLine();
      wordSlots.push({ line: lines.length - 1, column });
      current().push({
        char: letter.char,
        width: cellWidth,
        kind: letter.state,
        wordIndex,
        error: word.error,
      });
      column += cellWidth;
    }
    wordSlots.push({ line: lines.length - 1, column });
    slots.push(wordSlots);

    if (word.newline) {
      current().push({
        char: "↵",
        width: 1,
        kind: "newline",
        wordIndex,
        error: false,
      });
      breakLine();
    }
  });

  return { lines, slots };
}

function gapCell(wordIndex: number): Cell {
  return { char: " ", width: 1, kind: "gap", wordIndex, error: false };
}

/** Clamps the letter index to the letters actually shown, e.g. hidden extras. */
export function caretSlot(
  layout: WordsLayout,
  wordIndex: number,
  letterIndex: number,
): Position | undefined {
  const wordSlots = layout.slots[wordIndex];
  if (wordSlots === undefined) return undefined;
  return wordSlots[Math.min(letterIndex, wordSlots.length - 1)];
}

/**
 * Keeps the caret on the second visible line once it leaves the first, so the
 * line just typed stays visible, like the web.
 */
export function lineWindow(
  lineCount: number,
  caretLine: number,
  showAllLines: boolean,
): LineWindow {
  if (showAllLines) return { start: 0, end: lineCount };
  const start = Math.max(0, Math.min(caretLine - 1, lineCount - 1));
  return { start, end: Math.min(lineCount, start + visibleLineCount) };
}
