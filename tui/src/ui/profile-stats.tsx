import type { UserProfile } from "@oxytype/schemas/users";

import { Formatting } from "@oxytype/typing-core/format";
import { For, Show } from "solid-js";

import { useConfig } from "../config/store";
import { useTheme } from "../theme/theme";

export function ProfileStats(props: {
  profile: UserProfile;
  height: number;
  page?: number;
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
  return (
    <box flexDirection="column">
      <text fg={theme().colors.text}>
        {props.profile.name} · {props.profile.xp ?? 0} xp · streak{" "}
        {props.profile.streak} (max {props.profile.maxStreak})
      </text>
      <text fg={theme().colors.sub}>
        {props.profile.typingStats.completedTests ?? 0} completed ·{" "}
        {props.profile.typingStats.startedTests ?? 0} started ·{" "}
        {((props.profile.typingStats.timeTyping ?? 0) / 3600).toFixed(1)} hours
      </text>
      <Show when={props.profile.banned}>
        <text fg={theme().colors.error}>banned</text>
      </Show>
      <Show when={props.profile.details?.bio}>
        <text fg={theme().colors.text} wrapMode="word">
          {props.profile.details?.bio}
        </text>
      </Show>
      <Show when={props.profile.details?.keyboard}>
        <text fg={theme().colors.sub}>
          keyboard {props.profile.details?.keyboard}
        </text>
      </Show>
      <text fg={theme().colors.main}>
        personal bests · {bests().length} · page {page() + 1}/{pages()}
      </text>
      <For
        each={bests().slice(page() * props.height, (page() + 1) * props.height)}
      >
        {(entry) => (
          <text fg={theme().colors.text}>
            {entry.mode} {entry.amount} · {format().typingSpeed(entry.best.wpm)}{" "}
            {config.typingSpeedUnit} · {entry.best.acc.toFixed(1)}% ·{" "}
            {entry.best.language} {entry.best.punctuation ? "punctuation" : ""}{" "}
            {entry.best.numbers ? "numbers" : ""} {entry.best.difficulty}
          </text>
        )}
      </For>
      <Show when={bests().length === 0}>
        <text fg={theme().colors.sub}>no personal bests yet</text>
      </Show>
    </box>
  );
}
