import type { ResultMinified } from "@oxytype/schemas/results";

import { useTerminalDimensions } from "@opentui/solid";
import { Formatting } from "@oxytype/typing-core/format";
import { createMemo, createSignal, Show } from "solid-js";

import { useAccount } from "../account";
import { useConfig } from "../config/store";
import { usePalette } from "../palette/palette";
import { sparkline } from "../results/chart";
import {
  historyFiltersSchema,
  matchesFilters,
  type HistoryFilters,
} from "../results/filters";
import { useHistory } from "../results/history";
import { useScreenKeys } from "../shell/screen-keys";
import { useTheme } from "../theme/theme";
import { ListView } from "../ui/list-view";
import { createRemote, dataOrThrow } from "../ui/remote";
import { RemoteStatus } from "../ui/remote-status";
import { createSelection } from "../ui/selection";

export function HistoryScreen() {
  const history = useHistory();
  const account = useAccount();
  const palette = usePalette();
  const { config } = useConfig();
  const theme = useTheme();
  const dimensions = useTerminalDimensions();
  const [source, setSource] = createSignal<"local" | "tui" | "web">("local");
  const [filters, setFilters] = createSignal<HistoryFilters>({});
  const [detail, setDetail] = createSignal(false);
  const remote = createRemote(async () => {
    const client = source();
    const uid = account?.auth.user()?.uid;
    if (client === "local" || account === undefined || uid === undefined) {
      return undefined;
    }
    const result: ResultMinified[] = [];
    for (let offset = 0; ; offset += 1000) {
      const batch = dataOrThrow(
        await account.api.client.results.get({
          query: {
            client,
            offset,
            limit: 1000,
            ...(filters().after === undefined
              ? {}
              : {
                  onOrAfterTimestamp: Math.max(
                    1589428800000,
                    filters().after ?? 0,
                  ),
                }),
          },
        }),
      );
      if (account.auth.user()?.uid !== uid) return undefined;
      result.push(...batch);
      if (batch.length < 1000) return result;
    }
  });
  const entries = createMemo(() =>
    (source() === "local"
      ? history
          .entries()
          .map((entry) => ({ id: entry.id, result: entry.result }))
      : (remote.data() ?? []).map((result) => ({ id: result._id, result }))
    ).filter((entry) => matchesFilters(entry.result, filters())),
  );
  const height = () => Math.max(1, dimensions().height - 12);
  const selection = createSelection(() => entries().length, { page: height });
  const selected = () => entries()[selection.index()];
  const full = createRemote(async () => {
    const id = selected()?.id;
    const uid = account?.auth.user()?.uid;
    if (
      !detail() ||
      source() === "local" ||
      id === undefined ||
      uid === undefined ||
      account === undefined
    ) {
      return undefined;
    }
    return dataOrThrow(
      await account.api.client.results.getById({ params: { resultId: id } }),
    );
  });
  const result = () =>
    source() === "local" ? selected()?.result : full.data();
  const chartLine = (): string => {
    const chart = full.data()?.chartData;
    return chart !== undefined && chart !== "toolong"
      ? sparkline(chart.wpm, dimensions().width - 10, Math.max(1, ...chart.wpm))
      : "";
  };
  useScreenKeys((event) => {
    if (event.eventType === "release") return;
    if (event.ctrl || event.meta) {
      selection.handleKey(event);
      return;
    }
    if (event.name === "escape" && detail()) {
      event.preventDefault();
      setDetail(false);
    } else if (event.name === "tab") {
      event.preventDefault();
      setSource((value) =>
        account?.auth.user()
          ? value === "local"
            ? "tui"
            : value === "tui"
              ? "web"
              : "local"
          : "local",
      );
      selection.set(0);
      setDetail(false);
    } else if (event.name === "r" && !event.ctrl) {
      event.preventDefault();
      remote.reload();
      full.reload();
    } else if (event.name === "return") {
      event.preventDefault();
      setDetail((value) => !value);
    } else if (event.name === "f") {
      event.preventDefault();
      palette?.open({
        command: {
          id: "historyFilters",
          display: "History filters (JSON)",
          input: {
            placeholder:
              "mode, mode2, language, difficulty, pb, punctuation, numbers, tag, funbox, offline, after/before (ms)",
            defaultValue: () => JSON.stringify(filters()),
            submit: (value) => {
              try {
                const parsed = historyFiltersSchema.safeParse(
                  JSON.parse(value),
                );
                if (!parsed.success) return "Invalid filters";
                setFilters(parsed.data);
                selection.set(0);
                setDetail(false);
                return undefined;
              } catch {
                return "Enter a JSON object; {} clears filters";
              }
            },
          },
        },
      });
    } else if (event.name === "x") {
      event.preventDefault();
      setFilters({});
      selection.set(0);
    } else {
      selection.handleKey(event);
    }
  });
  return (
    <box flexDirection="column" gap={1} width="100%">
      <text fg={theme().colors.main}>
        {source()} history · {entries().length} tests
        {Object.keys(filters()).length ? " · filtered" : ""}
      </text>
      <Show when={source() !== "local"}>
        <RemoteStatus loading={remote.loading()} error={remote.error()} />
      </Show>
      <Show when={history.notice()}>
        <text fg={theme().colors.error}>{history.notice()}</text>
      </Show>
      <Show
        when={detail()}
        fallback={
          <ListView
            items={entries()}
            selected={selection.index()}
            height={height()}
            empty="no saved tests match"
            render={(entry, active) => (
              <text fg={active ? theme().colors.main : theme().colors.text}>
                {active ? "›" : " "}{" "}
                {new Date(entry.result.timestamp).toLocaleDateString()} ·{" "}
                {new Formatting(config).typingSpeed(entry.result.wpm)}{" "}
                {config.typingSpeedUnit} · {entry.result.acc.toFixed(1)}% ·{" "}
                {entry.result.mode} {entry.result.mode2} ·{" "}
                {entry.result.language ?? "english"}
              </text>
            )}
          />
        }
      >
        <RemoteStatus loading={full.loading()} error={full.error()} />
        <Show when={result()}>
          {(value) => (
            <box flexDirection="column" gap={1}>
              <text fg={theme().colors.main}>
                {new Formatting(config).typingSpeed(value().wpm)}{" "}
                {config.typingSpeedUnit} · {value().acc.toFixed(1)}% acc · raw{" "}
                {new Formatting(config).typingSpeed(value().rawWpm)}
              </text>
              <text fg={theme().colors.text}>
                consistency {value().consistency.toFixed(1)}% · time{" "}
                {value().testDuration.toFixed(2)}s · chars{" "}
                {value().charStats.join("/")}
              </text>
              <text fg={theme().colors.sub}>
                tags {value().tags?.join(" ") ?? "none"} ·{" "}
                {value().difficulty ?? "normal"} ·{" "}
                {value().offline ? "offline" : "online"}
              </text>
              <Show
                when={
                  full.data()?.chartData !== undefined &&
                  full.data()?.chartData !== "toolong"
                }
              >
                <text fg={theme().colors.main}>wpm {chartLine()}</text>
              </Show>
            </box>
          )}
        </Show>
      </Show>
      <text fg={theme().colors.sub}>
        ↑↓ select · enter details · tab local/TUI/web · f filters · x clear · r
        reload
      </text>
    </box>
  );
}
