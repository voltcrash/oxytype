/** Wide enough for settings rows; wider terminals centre the column. */
export const maxContentWidth = 120;

export function sidePadding(terminalWidth: number): number {
  return terminalWidth >= 100 ? 3 : 1;
}

/** Columns inside the shell's centred content column. */
export function contentWidth(terminalWidth: number): number {
  return Math.max(
    1,
    Math.min(terminalWidth - sidePadding(terminalWidth) * 2, maxContentWidth),
  );
}
