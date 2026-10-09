import { useTerminalDimensions } from "@opentui/solid";
import { createSignal, For, Show } from "solid-js";

import { useAccount } from "../account";
import { useScreenKeys } from "../shell/screen-keys";
import { useTheme } from "../theme/theme";
import { announcementLines } from "../ui/announcement-text";
import { KeyHints, parseHints } from "../ui/key-hints";
import { createRemote, dataOrThrow } from "../ui/remote";
import { RemoteStatus } from "../ui/remote-status";

export function AnnouncementsScreen() {
  const account = useAccount();
  const theme = useTheme();
  const dimensions = useTerminalDimensions();
  const [offset, setOffset] = createSignal(0);
  const announcements = createRemote(async () => {
    if (account === undefined) return [];
    return dataOrThrow(await account.api.client.psas.get());
  });
  const lines = () =>
    announcementLines(
      announcements.data() ?? [],
      Math.max(1, dimensions().width - 4),
    );
  const height = () => Math.max(1, dimensions().height - 11);
  const start = () =>
    Math.min(offset(), Math.max(0, lines().length - height()));
  useScreenKeys((event) => {
    if (event.eventType === "release") return;
    if (event.ctrl || event.meta) return;
    const step =
      event.name === "up"
        ? -1
        : event.name === "down"
          ? 1
          : event.name === "pageup"
            ? -height()
            : event.name === "pagedown"
              ? height()
              : 0;
    if (step !== 0) {
      event.preventDefault();
      setOffset(
        Math.max(0, Math.min(lines().length - height(), start() + step)),
      );
    } else if (event.name === "r") {
      event.preventDefault();
      setOffset(0);
      announcements.reload();
    }
  });
  return (
    <box flexDirection="column" gap={1}>
      <text fg={theme().colors.main}>server announcements</text>
      <RemoteStatus
        loading={announcements.loading()}
        error={announcements.error()}
      />
      <Show when={!announcements.loading() && lines().length === 0}>
        <text fg={theme().colors.sub}>no announcements</text>
      </Show>
      <box flexDirection="column">
        <For each={lines().slice(start(), start() + height())}>
          {(line) => (
            <text
              fg={
                line.level === -1
                  ? theme().colors.error
                  : line.level === 1
                    ? theme().colors.main
                    : theme().colors.text
              }
            >
              {line.text}
            </text>
          )}
        </For>
      </box>
      <KeyHints
        wrap
        hints={parseHints("↑↓ scroll · pgup/pgdn page · r reload")}
      />
    </box>
  );
}
