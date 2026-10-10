import type { ResultMinified } from "@oxytype/schemas/results";

import { useTerminalDimensions } from "@opentui/solid";
import { Formatting } from "@oxytype/typing-core/format";
import { createMemo, createSignal, Show } from "solid-js";

import { useAccount } from "../account";
import { useConfig } from "../config/store";
import { usePalette } from "../palette/palette";
import { LineChart } from "../results/chart";
import {
  historyFiltersSchema,
  matchesFilters,
  type HistoryFilters,
} from "../results/filters";
import { useHistory } from "../results/history";
import { contentWidth } from "../shell/layout";
import { useScreenKeys } from "../shell/screen-keys";
import { useTheme } from "../theme/theme";
import { BigText } from "../ui/big-text";
import { KeyHints, parseHints } from "../ui/key-hints";
import { ListView } from "../ui/list-view";
import { createRemote, dataOrThrow } from "../ui/remote";
import { RemoteStatus } from "../ui/remote-status";
import { createSelection } from "../ui/selection";
import { Tabs } from "../ui/tabs";

const sources = ["local", "tui", "web"] as const;
/** date, speed, accuracy, test and language columns. */
const columnWidths = [14, 8, 9, 12, 0];

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
  const chart = () => {
    const value = result();
    const data =
      value !== undefined && "chartData" in value ? value.chartData : undefined;
    return data === undefined || data === "toolong" ? undefined : data;
  };
  const format = (): Formatting => new Formatting(config);
  const columns = (cells: string[]): string =>
    cells.map((cell, index) => cell.padEnd(columnWidths[index] ?? 0)).join("");
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
    <box flexDirection="column" gap={1} width="100%" flexGrow={1}>
      <box flexDirection="row" gap={3} flexShrink={0}>
        <Tabs
          tabs={(account?.auth.user() ? sources : (["local"] as const)).map(
            (it) => ({ label: it, active: source() === it }),
          )}
        />
        <text fg={theme().colors.sub} flexShrink={0}>
          {entries().length} {entries().length === 1 ? "test" : "tests"}
          {Object.keys(filters()).length ? " · filtered" : ""}
        </text>
      </box>
      <Show when={source() !== "local"}>
        <RemoteStatus loading={remote.loading()} error={remote.error()} />
      </Show>
      <Show when={history.notice()}>
        <text fg={theme().colors.error}>{history.notice()}</text>
      </Show>
      <Show
        when={detail()}
        fallback={
          <box flexDirection="column" flexShrink={0}>
            <Show when={entries().length > 0}>
              <text fg={theme().colors.sub}>
                {`  ${columns(["date", config.typingSpeedUnit, "acc", "test", "language"])}`}
              </text>
            </Show>
            <ListView
              items={entries()}
              selected={selection.index()}
              height={height()}
              empty="no saved tests match"
              render={(entry) => (
                <text fg={theme().colors.text}>
                  {columns([
                    new Date(entry.result.timestamp).toLocaleDateString(),
                    format().typingSpeed(entry.result.wpm),
                    `${entry.result.acc.toFixed(1)}%`,
                    `${entry.result.mode} ${entry.result.mode2}`,
                    (entry.result.language ?? "english").replaceAll("_", " "),
                  ])}
                </text>
              )}
            />
          </box>
        }
      >
        <RemoteStatus loading={full.loading()} error={full.error()} />
        <Show when={result()}>
          {(value) => (
            <box flexDirection="column" gap={1} flexShrink={0}>
              <box flexDirection="row" gap={4} flexShrink={0}>
                <box flexDirection="column" flexShrink={0}>
                  <text fg={theme().colors.sub}>{config.typingSpeedUnit}</text>
                  <BigText
                    text={format().typingSpeed(value().wpm)}
                    fg={theme().colors.main}
                  />
                </box>
                <box flexDirection="column" flexShrink={0}>
                  <text fg={theme().colors.sub}>acc</text>
                  <BigText
                    text={format().accuracy(value().acc)}
                    fg={theme().colors.main}
                  />
                </box>
              </box>
              <text fg={theme().colors.text}>
                raw {format().typingSpeed(value().rawWpm)} · consistency{" "}
                {value().consistency.toFixed(1)}% · time{" "}
                {value().testDuration.toFixed(2)}s · chars{" "}
                {value().charStats.join("/")}
              </text>
              <text fg={theme().colors.sub}>
                {value().mode} {value().mode2} ·{" "}
                {(value().language ?? "english").replaceAll("_", " ")} ·{" "}
                {(value().tags?.length ?? 0) > 0
                  ? `tags ${value().tags?.join(" ")}`
                  : "no tags"}{" "}
                · {value().difficulty ?? "normal"} ·{" "}
                {value().offline ? "offline" : "online"}
              </text>
              <Show when={chart()}>
                {(data) => (
                  <Show when={dimensions().height >= 26}>
                    <LineChart
                      series={[
                        {
                          label: "raw",
                          values: data().burst,
                          color: theme().colors.sub,
                        },
                        {
                          label: config.typingSpeedUnit,
                          values: data().wpm,
                          color: theme().colors.main,
                        },
                      ]}
                      errors={data().err}
                      width={contentWidth(dimensions().width)}
                      height={4}
                      minimum={0}
                      maximum={Math.max(1, ...data().wpm, ...data().burst)}
                      duration={value().testDuration}
                    />
                  </Show>
                )}
              </Show>
            </box>
          )}
        </Show>
      </Show>
      <box flexGrow={1} />
      <KeyHints
        wrap
        hints={parseHints(
          detail()
            ? "enter back to list · ↑↓ previous/next · tab local/TUI/web"
            : "↑↓ select · enter details · tab local/TUI/web · f filters · x clear · r reload",
        )}
      />
    </box>
  );
}
