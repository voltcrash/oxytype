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
type BarItem = { label: string; active: boolean; select?: () => void };

const quoteLengths: { label: string; value: Config["quoteLength"] }[] = [
  { label: "all", value: [0, 1, 2, 3] },
  { label: "short", value: [0] },
  { label: "medium", value: [1] },
  { label: "long", value: [2] },
  { label: "thicc", value: [3] },
];

/** The web's test config strip: toggles, modes and lengths on one pill. */
export function ModeBar(props: {
  config?: Readonly<Config>;
  /** Custom mode has no presets; its limit shows as text. */
  customLabel?: string;
  compact?: boolean;
}) {
  const store = useConfig();
  const config = (): Readonly<Config> => props.config ?? store.config;
  const theme = useTheme();
  const amounts = (key: "time" | "words", values: number[]): BarItem[] => {
    const current = config()[key];
    return [
      ...values.map((value) => ({
        label: String(value),
        active: current === value,
        select: () => store.set(key, value),
      })),
      ...(values.includes(current)
        ? []
        : [
            {
              label: current === 0 ? "unlimited" : String(current),
              active: true,
            },
          ]),
    ];
  };
  const groups = (): BarItem[][] => {
    const mode = config().mode;
    const length =
      mode === "time"
        ? amounts("time", [15, 30, 60, 120])
        : mode === "words"
          ? amounts("words", [10, 25, 50, 100])
          : mode === "quote"
            ? quoteLengths.map((it) => ({
                label: it.label,
                active: config().quoteLength.join() === it.value.join(),
                select: () => store.set("quoteLength", it.value),
              }))
            : mode === "custom" && props.customLabel !== undefined
              ? [{ label: props.customLabel, active: true }]
              : [];
    return [
      [
        {
          label: props.compact === true ? "punct" : "punctuation",
          active: config().punctuation,
          select: () => store.set("punctuation", !store.config.punctuation),
        },
        {
          label: "numbers",
          active: config().numbers,
          select: () => store.set("numbers", !store.config.numbers),
        },
      ],
      modes.map((it) => ({
        label: it,
        active: mode === it,
        select: () => store.set("mode", it),
      })),
      length,
    ].filter((group) => group.length > 0);
  };
  return (
    <box
      flexDirection="row"
      flexShrink={0}
      backgroundColor={theme().colors.subAlt}
      paddingLeft={1}
      paddingRight={1}
      gap={props.compact === true ? 1 : 2}
    >
      <For each={groups()}>
        {(group, index) => (
          <>
            <Show when={index() > 0}>
              <text fg={theme().colors.bg}>│</text>
            </Show>
            <For each={group}>
              {(item) => (
                <text
                  fg={item.active ? theme().colors.main : theme().colors.sub}
                  onMouseDown={() => item.select?.()}
                >
                  {item.label}
                </text>
              )}
            </For>
          </>
        )}
      </For>
    </box>
  );
}
