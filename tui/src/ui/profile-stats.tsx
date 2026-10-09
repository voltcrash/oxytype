import type { UserProfile } from "@oxytype/schemas/users";

import { Formatting } from "@oxytype/typing-core/format";
import { For, Show } from "solid-js";

import { useConfig } from "../config/store";
import { useTheme } from "../theme/theme";
import { StyledLine } from "./styled";

/** test, speed, accuracy, language, then flags. */
const columnWidths = [14, 8, 9, 16, 0];

export function ProfileStats(props: {
  profile: UserProfile;
  height: number;
  page?: number;
  /** The account screen already heads the page with the name. */
  hideName?: boolean;
}) {
  const { config } = useConfig();
  const theme = useTheme();
  const bests = () =>
    Object.entries(props.profile.personalBests).flatMap(([mode, amounts]) =>
      Object.entries(amounts).flatMap(([amount, entries]) =>
        entries.map((best) => ({ mode, amount, best })),
      ),
    );
  const format = () => new Formatting(config);
  const pages = () =>
    Math.max(1, Math.ceil(bests().length / Math.max(1, props.height)));
  const page = () => Math.min(Math.max(0, props.page ?? 0), pages() - 1);
  const stats = (): { label: string; value: string }[] => [
    { label: "xp", value: String(props.profile.xp ?? 0) },
    {
      label: "streak",
      value: `${props.profile.streak} (max ${props.profile.maxStreak})`,
    },
    {
      label: "completed",
      value: String(props.profile.typingStats.completedTests ?? 0),
    },
    {
      label: "started",
      value: String(props.profile.typingStats.startedTests ?? 0),
    },
    {
      label: "time typing",
      value: `${((props.profile.typingStats.timeTyping ?? 0) / 3600).toFixed(1)}h`,
    },
  ];
  const columns = (cells: string[]): string =>
    cells.map((cell, index) => cell.padEnd(columnWidths[index] ?? 0)).join("");
  return (
    <box flexDirection="column" gap={1}>
      <Show
        when={
          props.hideName !== true ||
          props.profile.banned === true ||
          props.profile.details?.bio !== undefined ||
          props.profile.details?.keyboard !== undefined
        }
      >
        <box flexDirection="column" flexShrink={0}>
          <Show when={props.hideName !== true || props.profile.banned === true}>
            <StyledLine
              chunks={[
                ...(props.hideName === true
                  ? []
                  : [
                      {
                        text: `${props.profile.name}  `,
                        fg: theme().colors.text,
                        bold: true,
                      },
                    ]),
                ...(props.profile.banned === true
                  ? [{ text: "banned", fg: theme().colors.error }]
                  : []),
              ]}
            />
          </Show>
          <Show when={props.profile.details?.bio}>
            <text fg={theme().colors.sub} wrapMode="word">
              {props.profile.details?.bio}
            </text>
          </Show>
          <Show when={props.profile.details?.keyboard}>
            <text fg={theme().colors.sub}>
              keyboard {props.profile.details?.keyboard}
            </text>
          </Show>
        </box>
      </Show>
      <box flexDirection="row" gap={4} flexShrink={0} flexWrap="wrap">
        <For each={stats()}>
          {(stat) => (
            <box flexDirection="column" flexShrink={0}>
              <text fg={theme().colors.sub}>{stat.label}</text>
              <text fg={theme().colors.text}>{stat.value}</text>
            </box>
          )}
        </For>
      </box>
      <box flexDirection="column" flexShrink={0}>
        <StyledLine
          chunks={[
            { text: "personal bests", fg: theme().colors.main },
            {
              text: `  ${bests().length} · page ${page() + 1}/${pages()}`,
              fg: theme().colors.sub,
            },
          ]}
        />
        <Show
          when={bests().length > 0}
          fallback={<text fg={theme().colors.sub}>no personal bests yet</text>}
        >
          <text fg={theme().colors.sub}>
            {columns(["test", config.typingSpeedUnit, "acc", "language", ""])}
          </text>
          <For
            each={bests().slice(
              page() * props.height,
              (page() + 1) * props.height,
            )}
          >
            {(entry) => (
              <text fg={theme().colors.text}>
                {columns([
                  `${entry.mode} ${entry.amount}`,
                  format().typingSpeed(entry.best.wpm),
                  `${entry.best.acc.toFixed(1)}%`,
                  entry.best.language.replaceAll("_", " "),
                  [
                    entry.best.punctuation === true ? "punctuation" : "",
                    entry.best.numbers === true ? "numbers" : "",
                    entry.best.difficulty ?? "",
                  ]
                    .filter((it) => it !== "")
                    .join(" "),
                ])}
              </text>
            )}
          </For>
        </Show>
      </box>
    </box>
  );
}
