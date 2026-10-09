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
import { ListView } from "../ui/list-view";
import { createRemote, dataOrThrow } from "../ui/remote";
import { RemoteStatus } from "../ui/remote-status";
import { createSelection } from "../ui/selection";

type BoardEntry = {
  rank: number;
  name: string;
  score: string;
  details: string;
};
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
          score: `${entry.totalXp} xp`,
          details: `${(entry.timeTypedSeconds / 3600).toFixed(1)} hours`,
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
        score: `${format.typingSpeed(entry.wpm)} ${config.typingSpeedUnit}`,
        details: `${entry.acc.toFixed(1)}% · raw ${format.typingSpeed(entry.raw)}`,
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
  return (
    <box flexDirection="column" gap={1}>
      <text fg={theme().colors.main}>
        leaderboards · {kind()} · {client()} · {language().replaceAll("_", " ")}{" "}
        · {mode()} {amount()}
      </text>
      <RemoteStatus loading={board.loading()} error={board.error()} />
      <Show
        when={account !== undefined}
        fallback={<text fg={theme().colors.sub}>API service unavailable</text>}
      >
        <ListView
          items={items()}
          selected={selection.index()}
          height={Math.max(1, dimensions().height - 12)}
          empty="no entries"
          render={(entry, active) => (
            <text fg={active ? theme().colors.main : theme().colors.text}>
              {active ? "›" : " "} {entry.rank + 1}. {entry.name.padEnd(16)}{" "}
              {entry.score} · {entry.details}
            </text>
          )}
        />
        <text fg={theme().colors.sub}>
          page {page() + 1}/{pages()} · your rank{" "}
          {rank.data() === undefined ? "unranked" : (rank.data() ?? 0) + 1}
        </text>
        <RemoteStatus loading={rank.loading()} error={rank.error()} />
        <text fg={theme().colors.sub}>
          ↑↓ select · ←→ pages · tab board · c client · l language · m test ·
          enter profile
        </text>
      </Show>
    </box>
  );
}
