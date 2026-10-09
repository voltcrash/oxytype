import type { Chunk } from "./styled";

import { useTheme } from "../theme/theme";
import { StyledLine } from "./styled";

export type Tab = { label: string; active: boolean; hint?: string };

/** A row of labels; the active one sits on a raised pill. */
export function Tabs(props: { tabs: readonly Tab[]; gap?: number }) {
  const theme = useTheme();
  const chunks = (): Chunk[] =>
    props.tabs.flatMap((tab, index): Chunk[] => {
      const colors = theme().colors;
      const bg = tab.active ? colors.subAlt : undefined;
      return [
        ...(index === 0 ? [] : [{ text: " ".repeat(props.gap ?? 1) }]),
        ...(tab.hint === undefined
          ? []
          : [{ text: ` ${tab.hint}`, fg: colors.sub, bg }]),
        {
          text: ` ${tab.label} `,
          fg: tab.active ? colors.text : colors.sub,
          bg,
        },
      ];
    });
  return <StyledLine chunks={chunks()} />;
}
