import { For, Show } from "solid-js";

import { useConfig } from "../config/store";
import { useTheme } from "../theme/theme";
import { createRemote } from "../ui/remote";
import { StyledLine, type Chunk } from "../ui/styled";
import { useTypingTest } from "./typing-test";

export function Keymap() {
  const { config } = useConfig();
  const test = useTypingTest();
  const theme = useTheme();
  const layout = createRemote(async () => {
    if (config.keymapMode === "off") return undefined;
    const name =
      config.keymapLayout === "overrideSync"
        ? config.layout === "default"
          ? "qwerty"
          : config.layout
        : config.keymapLayout;
    return test.sources.getLayout(name);
  });
  const highlighted = (): string => {
    if (config.keymapMode === "static") return "";
    const input = Array.from(test.inputFor(test.activeIndex()));
    return config.keymapMode === "next"
      ? (Array.from(test.words()[test.activeIndex()] ?? "")[input.length] ?? "")
      : (input.at(-1) ?? "");
  };
  const rows = () => {
    const data = layout.data();
    return data === undefined
      ? []
      : [
          ...(config.keymapKeys !== "minimal" || data.keymapShowTopRow
            ? [data.keys.row1]
            : []),
          data.keys.row2,
          data.keys.row3,
          data.keys.row4,
        ];
  };
  const chunks = (row: string[][]): Chunk[] =>
    row.flatMap((variants) => {
      const active = highlighted() !== "" && variants.includes(highlighted());
      const legend =
        config.keymapLegendStyle === "blank"
          ? " "
          : config.keymapLegendStyle === "uppercase"
            ? (variants[1] ?? variants[0] ?? " ")
            : config.keymapLegendStyle === "dynamic" && active
              ? highlighted()
              : (variants[0] ?? " ");
      return [
        {
          text: `[${legend}]`,
          fg: active ? theme().colors.bg : theme().colors.sub,
          bg: active ? theme().colors.main : undefined,
        },
        { text: " " },
      ];
    });
  return (
    <Show when={config.keymapMode !== "off"}>
      <box flexDirection="column" flexShrink={0}>
        <For each={rows()}>{(row) => <StyledLine chunks={chunks(row)} />}</For>
        <Show when={layout.error()}>
          <text fg={theme().colors.error}>{layout.error()}</text>
        </Show>
      </box>
    </Show>
  );
}
