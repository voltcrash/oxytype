import { useTerminalDimensions } from "@opentui/solid";
import { Formatting } from "@oxytype/typing-core/format";
import { createMemo, createSignal, For, Show } from "solid-js";

import { useConfig } from "../config/store";
import { useHistory } from "../results/history";
import { useScreenKeys } from "../shell/screen-keys";
import { useTheme } from "../theme/theme";

export function HistoryScreen() {
  const history = useHistory();
  const { config } = useConfig();
  const theme = useTheme();
  const dimensions = useTerminalDimensions();
  const [page, setPage] = createSignal(0);
  const pageSize = (): number => Math.max(1, dimensions().height - 9);
  const pages = (): number =>
    Math.max(1, Math.ceil(history.entries().length / pageSize()));
  const entries = createMemo(() =>
    history
      .entries()
      .slice(
        Math.min(page(), pages() - 1) * pageSize(),
        (Math.min(page(), pages() - 1) + 1) * pageSize(),
      ),
  );
  useScreenKeys((event) => {
    if (event.eventType === "release") return;
    if (
      event.name !== "up" &&
      event.name !== "down" &&
      event.name !== "pageup" &&
      event.name !== "pagedown"
    ) {
      return;
    }
    event.preventDefault();
    setPage((current) =>
      Math.max(
        0,
        Math.min(
          pages() - 1,
          current + (event.name === "up" || event.name === "pageup" ? -1 : 1),
        ),
      ),
    );
  });
  return (
    <box flexDirection="column" gap={1} width="100%">
      <text fg={theme().colors.main}>
        local history · {history.entries().length} tests
      </text>
      <Show when={history.notice()}>
        {(notice) => <text fg={theme().colors.error}>{notice()}</text>}
      </Show>
      <Show
        when={entries().length > 0}
        fallback={<text fg={theme().colors.sub}>no saved tests yet</text>}
      >
        <box flexDirection="column">
          <For each={entries()}>
            {(entry) => (
              <text fg={theme().colors.text}>
                {new Date(entry.result.timestamp).toLocaleDateString()} ·{" "}
                {new Formatting(config).typingSpeed(entry.result.wpm)}{" "}
                {config.typingSpeedUnit} · {entry.result.acc.toFixed(1)}% ·{" "}
                {entry.result.mode} {entry.result.mode2} ·{" "}
                {entry.result.language}
              </text>
            )}
          </For>
        </box>
      </Show>
      <text fg={theme().colors.sub}>
        page {Math.min(page(), pages() - 1) + 1}/{pages()} · up/down pages · esc
        back
      </text>
    </box>
  );
}
