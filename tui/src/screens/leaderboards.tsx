import type { Mode } from "@oxytype/schemas/shared";

import { useTerminalDimensions } from "@opentui/solid";
import { LanguageSchema, type Language } from "@oxytype/schemas/languages";
import { Formatting } from "@oxytype/typing-core/format";
import { createSignal, Show } from "solid-js";

import { useAccount } from "../account";
import { useConfig } from "../config/store";
import { usePalette } from "../palette/palette";
import { useRouter } from "../router/router";
import { useScreenKeys } from "../shell/screen-keys";
import { useTheme } from "../theme/theme";
import { KeyHints, parseHints } from "../ui/key-hints";
import { ListView } from "../ui/list-view";
import { createRemote, dataOrThrow } from "../ui/remote";
import { RemoteStatus } from "../ui/remote-status";
import { createSelection } from "../ui/selection";
import { StyledLine, type Chunk } from "../ui/styled";

type BoardEntry = {
  rank: number;
  name: string;
  /** Score columns after rank and name, matching the board's headings. */
  cells: string[];
};
/** Rank, name, then score columns. */
const columnWidths = [6, 20, 10, 9, 0];
export function LeaderboardsScreen() {
  const account = useAccount();
  const { config } = useConfig();
  const palette = usePalette();
  const router = useRouter();
  const theme = useTheme();
  const dimensions = useTerminalDimensions();
  const [kind, setKind] = createSignal<"all-time" | "daily" | "weekly xp">(
    "all-time",
  );
  const [client, setClient] = createSignal<"tui" | "web">("tui");
  const [language, setLanguage] = createSignal<Language>(config.language);
  const [mode, setMode] = createSignal<Mode>("time");
  const [amount, setAmount] = createSignal("15");
  const [page, setPage] = createSignal(0);
  const board = createRemote(async () => {
    if (account === undefined) return undefined;
    const query = {
      client: client(),
      language: language(),
      mode: mode(),
      mode2: amount(),
      page: page(),
      pageSize: 50,
    };
    const type = kind();
    const format = new Formatting(config);
    if (type === "weekly xp") {
      const response = dataOrThrow(
        await account.api.client.leaderboards.getWeeklyXp({
          query: {
            client: query.client,
            page: query.page,
            pageSize: query.pageSize,
          },
        }),
      );
      return {
        ...response,
        entries: response.entries.map((entry): BoardEntry => ({
          rank: entry.rank,
          name: entry.name,
          cells: [
            `${entry.totalXp}`,
            `${(entry.timeTypedSeconds / 3600).toFixed(1)}h`,
          ],
        })),
      };
    }
    const response = dataOrThrow(
      await (type === "daily"
        ? account.api.client.leaderboards.getDaily({ query })
        : account.api.client.leaderboards.get({ query })),
    );
    return {
      ...response,
      entries: response.entries.map((entry): BoardEntry => ({
        rank: entry.rank,
        name: entry.name,
        cells: [
          format.typingSpeed(entry.wpm),
          `${entry.acc.toFixed(1)}%`,
          format.typingSpeed(entry.raw),
        ],
      })),
    };
  });
  const rank = createRemote(async () => {
    if (account?.auth.user() === undefined) return undefined;
    const query = {
      client: client(),
      language: language(),
      mode: mode(),
      mode2: amount(),
    };
    if (kind() === "weekly xp") {
      return dataOrThrow(
        await account.api.client.leaderboards.getWeeklyXpRank({
          query: { client: query.client },
        }),
      )?.rank;
    }
    return dataOrThrow(
      await (kind() === "daily"
        ? account.api.client.leaderboards.getDailyRank({ query })
        : account.api.client.leaderboards.getRank({ query })),
    )?.rank;
  });
  const items = () => board.data()?.entries ?? [];
  const selection = createSelection(() => items().length);
  const pages = () => Math.max(1, Math.ceil((board.data()?.count ?? 0) / 50));
  useScreenKeys((event) => {
    if (event.eventType === "release") return;
    if (event.ctrl || event.meta) {
      selection.handleKey(event);
      return;
    }
    if (event.name === "tab") {
      event.preventDefault();
      setKind((value) =>
        value === "all-time"
          ? "daily"
          : value === "daily"
            ? "weekly xp"
            : "all-time",
      );
      setPage(0);
      selection.set(0);
    } else if (event.name === "c") {
      event.preventDefault();
      setClient((value) => (value === "tui" ? "web" : "tui"));
      setPage(0);
      selection.set(0);
    } else if (event.name === "l" && !event.ctrl) {
      event.preventDefault();
      palette?.open({
        group: {
          title: "Leaderboard language",
          list: LanguageSchema.options.map((value) => ({
            id: `boardLanguage${value}`,
            display: value.replaceAll("_", " "),
            active: () => language() === value,
            exec: () => {
              setLanguage(value);
              setPage(0);
              selection.set(0);
            },
          })),
        },
      });
    } else if (event.name === "m") {
      event.preventDefault();
      palette?.open({
        group: {
          title: "Leaderboard test",
          list: (["time", "words"] as const).flatMap((value) =>
            (value === "time" ? [15, 30, 60, 120] : [10, 25, 50, 100]).map(
              (count) => ({
                id: `boardTest${value}${count}`,
                display: `${value} ${count}`,
                exec: () => {
                  setMode(value);
                  setAmount(String(count));
                  setPage(0);
                  selection.set(0);
                },
              }),
            ),
          ),
        },
      });
    } else if (event.name === "left" || event.name === "right") {
      event.preventDefault();
      setPage((value) =>
        Math.max(
          0,
          Math.min(pages() - 1, value + (event.name === "left" ? -1 : 1)),
        ),
      );
      selection.set(0);
    } else if (event.name === "r" && !event.ctrl) {
      event.preventDefault();
      board.reload();
      rank.reload();
    } else if (
      event.name === "return" &&
      items()[selection.index()] !== undefined
    ) {
      event.preventDefault();
      router.openProfile(items()[selection.index()]?.name ?? "");
    } else {
      selection.handleKey(event);
    }
  });
  const headings = (): string[] =>
    kind() === "weekly xp"
      ? ["#", "name", "xp", "typed"]
      : ["#", "name", config.typingSpeedUnit, "acc", "raw"];
  const pad = (cells: string[]): string[] =>
    cells.map((cell, index) => {
      const width = columnWidths[index] ?? 0;
      return width === 0 ? cell : cell.slice(0, width - 1).padEnd(width);
    });
  const filters = (): Chunk[] =>
    [
      ["tab", kind()],
      ["c", client()],
      ["l", language().replaceAll("_", " ")],
      ...(kind() === "weekly xp" ? [] : [["m", `${mode()} ${amount()}`]]),
    ].flatMap(([key, value], index): Chunk[] => [
      ...(index === 0 ? [] : [{ text: "   " }]),
      { text: `${key} `, fg: theme().colors.sub },
      {
        text: ` ${value} `,
        fg: theme().colors.text,
        bg: theme().colors.subAlt,
      },
    ]);
  const row = (entry: BoardEntry): Chunk[] => {
    const [rankCell = "", name = "", ...rest] = pad([
      String(entry.rank + 1),
      entry.name,
      ...entry.cells,
    ]);
    return [
      {
        text: rankCell,
        fg: entry.rank < 3 ? theme().colors.main : theme().colors.sub,
      },
      { text: name, fg: theme().colors.text },
      { text: rest.join(""), fg: theme().colors.text },
    ];
  };
  return (
    <box flexDirection="column" gap={1} flexGrow={1}>
      <StyledLine chunks={filters()} />
      <RemoteStatus loading={board.loading()} error={board.error()} />
      <Show
        when={account !== undefined}
        fallback={<text fg={theme().colors.sub}>API service unavailable</text>}
      >
        <box flexDirection="column" flexShrink={0}>
          <Show when={items().length > 0}>
            <text
              fg={theme().colors.sub}
            >{`  ${pad(headings()).join("")}`}</text>
          </Show>
          <ListView
            items={items()}
            selected={selection.index()}
            height={Math.max(1, dimensions().height - 15)}
            empty="no entries"
            render={(entry) => <StyledLine chunks={row(entry)} />}
          />
        </box>
        <text fg={theme().colors.sub}>
          page {page() + 1}/{pages()} · your rank{" "}
          {rank.data() === undefined ? "unranked" : (rank.data() ?? 0) + 1}
        </text>
        <RemoteStatus loading={rank.loading()} error={rank.error()} />
      </Show>
      <box flexGrow={1} />
      <Show when={account !== undefined}>
        <KeyHints
          wrap
          hints={parseHints(
            "↑↓ select · ←→ pages · tab board · c client · l language · m test · enter profile",
          )}
        />
      </Show>
    </box>
  );
}
