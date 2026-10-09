import type { JSX } from "solid-js";

import { createMemo, For, Show } from "solid-js";

import { useTheme } from "../theme/theme";
import { listWindow } from "./selection";

/** A windowed list with a highlighted, always visible selection. */
export function ListView<T>(props: {
  items: readonly T[];
  selected: number;
  height: number;
  render: (item: T, selected: boolean, index: number) => JSX.Element;
  empty?: string;
}) {
  const theme = useTheme();
  const window = createMemo(() =>
    listWindow(props.items.length, props.selected, props.height),
  );
  const visible = createMemo(() =>
    props.items
      .slice(window().start, window().end)
      .map((item, offset) => ({ item, index: window().start + offset })),
  );
  return (
    <box flexDirection="column" flexShrink={0}>
      <Show
        when={props.items.length > 0}
        fallback={
          <text fg={theme().colors.sub}>{props.empty ?? "nothing here"}</text>
        }
      >
        <For each={visible()}>
          {(entry) =>
            props.render(
              entry.item,
              entry.index === props.selected,
              entry.index,
            )
          }
        </For>
        <Show when={props.items.length > props.height}>
          <text fg={theme().colors.sub}>
            {props.selected + 1}/{props.items.length}
          </text>
        </Show>
      </Show>
    </box>
  );
}
