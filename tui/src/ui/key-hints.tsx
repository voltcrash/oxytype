import type { Chunk } from "./styled";

import { useTheme } from "../theme/theme";
import { StyledLine } from "./styled";

export type Hint = { key: string; label: string };

/** Keys read brighter than their labels, like lazygit and charm help rows. */
export function KeyHints(props: { hints: readonly Hint[]; wrap?: boolean }) {
  const theme = useTheme();
  const chunks = (): Chunk[] =>
    props.hints.flatMap((hint, index): Chunk[] => [
      ...(index === 0 ? [] : [{ text: "  " }]),
      { text: hint.key, fg: theme().colors.text },
      { text: ` ${hint.label}`, fg: theme().colors.sub },
    ]);
  return <StyledLine chunks={chunks()} wrap={props.wrap} />;
}
