import type { Config } from "@oxytype/schemas/configs";

import { For, Show } from "solid-js";

import { useConfig } from "../config/store";
import { useTheme } from "../theme/theme";

const modes: Config["mode"][] = ["time", "words", "quote", "zen", "custom"];

export function cycleMode(config: Config): Config["mode"] {
  return modes[(modes.indexOf(config.mode) + 1) % modes.length] ?? "time";
}
export function changeAmount(
  store: ReturnType<typeof useConfig>,
  step: number,
): void {
  const config = store.config;
  if (config.mode === "time" || config.mode === "words") {
    const key = config.mode === "time" ? "time" : "words";
    const values = key === "time" ? [15, 30, 60, 120, 0] : [10, 25, 50, 100, 0];
    const index = values.indexOf(config[key]);
    store.set(
      key,
      values[(index + step + values.length) % values.length] ?? values[0] ?? 30,
    );
  } else if (config.mode === "quote") {
    const values: Config["quoteLength"][] = [[0], [1], [2], [3], [0, 1, 2, 3]];
    const index = values.findIndex(
      (value) => value.join() === config.quoteLength.join(),
    );
    store.set(
      "quoteLength",
      values[(index + step + values.length) % values.length] ?? [0],
    );
  }
}
export function ModeBar() {
  const store = useConfig();
  const theme = useTheme();
  return (
    <box flexDirection="row" gap={2} flexWrap="wrap" flexShrink={0}>
      <For each={modes}>
        {(mode) => (
          <text
            fg={
              store.config.mode === mode
                ? theme().colors.main
                : theme().colors.sub
            }
            onMouseDown={() => {
              store.set("mode", mode);
            }}
          >
            <Show
              when={store.config.mode === mode}
              fallback={mode}
            >{`[${mode}]`}</Show>
          </text>
        )}
      </For>
      <text
        fg={store.config.punctuation ? theme().colors.main : theme().colors.sub}
        onMouseDown={() => {
          store.set("punctuation", !store.config.punctuation);
        }}
      >
        punctuation
      </text>
      <text
        fg={store.config.numbers ? theme().colors.main : theme().colors.sub}
        onMouseDown={() => {
          store.set("numbers", !store.config.numbers);
        }}
      >
        numbers
      </text>
    </box>
  );
}
