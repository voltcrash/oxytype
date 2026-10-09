import type { Chunk } from "./styled";

import { useTheme } from "../theme/theme";
import { StyledLine } from "./styled";

export type Hint = { key: string; label: string };

/** `"↑↓ select · enter open"`: each part's first word is its key. */
export function parseHints(text: string): Hint[] {
  return text.split(" · ").map((part) => {
    const space = part.indexOf(" ");
    return space === -1
      ? { key: "", label: part }
      : { key: part.slice(0, space), label: part.slice(space + 1) };
  });
}

/** Keys read brighter than their labels, like lazygit and charm help rows. */
export function KeyHints(props: { hints: readonly Hint[]; wrap?: boolean }) {
  const theme = useTheme();
  const chunks = (): Chunk[] =>
    props.hints.flatMap((hint, index): Chunk[] => [
      ...(index === 0 ? [] : [{ text: "  " }]),
      ...(hint.key === ""
        ? []
        : [{ text: `${hint.key} `, fg: theme().colors.text }]),
      { text: hint.label, fg: theme().colors.sub },
    ]);
  return <StyledLine chunks={chunks()} wrap={props.wrap} />;
}
