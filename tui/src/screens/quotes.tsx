import { useTerminalDimensions } from "@opentui/solid";
import { LanguageSchema, type Language } from "@oxytype/schemas/languages";
import { createMemo, createSignal, Show } from "solid-js";

import { useAccount } from "../account";
import { useConfig } from "../config/store";
import { usePalette } from "../palette/palette";
import { useRouter } from "../router/router";
import { useScreenKeys } from "../shell/screen-keys";
import { useTypingTest } from "../test/typing-test";
import { useTheme } from "../theme/theme";
import { createAction } from "../ui/actions";
import { ListView } from "../ui/list-view";
import { createRemote } from "../ui/remote";
import { RemoteStatus } from "../ui/remote-status";
import { createSelection } from "../ui/selection";
import { createTextField } from "../ui/text-field";
import { TextInput } from "../ui/text-input";

export function QuotesScreen() {
  const account = useAccount();
  const test = useTypingTest();
  const { config } = useConfig();
  const router = useRouter();
  const palette = usePalette();
  const theme = useTheme();
  const dimensions = useTerminalDimensions();
  const action = createAction();
  const [language, setLanguage] = createSignal<Language>(config.language);
  const [onlyFavorites, setOnlyFavorites] = createSignal(false);
  const [editing, setEditing] = createSignal(false);
  const search = createTextField();
  const quotes = createRemote(
    async () =>
      (await test.sources.quotes.getQuotes(language(), [0, 1, 2, 3])).quotes,
  );
  const favorites = createRemote(async () => {
    if (account?.auth.user() === undefined) return undefined;
    await account.favorites.reload();
    return true;
  });
  const isFavorite = (id: number, quoteLanguage: string): boolean =>
    account?.favorites.get()[quoteLanguage as Language]?.includes(String(id)) ??
    false;
  const items = createMemo(() =>
    (quotes.data() ?? []).filter(
      (quote) =>
        (!onlyFavorites() || isFavorite(quote.id, quote.language)) &&
        search
          .value()
          .toLowerCase()
          .split(/\s+/)
          .every((part) =>
            `${quote.id} ${quote.text} ${quote.source}`
              .toLowerCase()
              .includes(part),
          ),
    ),
  );
  const selection = createSelection(() => items().length);
  const selected = () => items()[selection.index()];
  useScreenKeys((event) => {
    if (event.eventType === "release") return;
    if (editing()) {
      if (event.name === "escape" || event.name === "return") {
        event.preventDefault();
        setEditing(false);
      } else if (search.handleKey(event)) {
        selection.set(0);
      }
      return;
    }
    if (event.name === "/") {
      event.preventDefault();
      setEditing(true);
    } else if (event.name === "v") {
      event.preventDefault();
      setOnlyFavorites((value) => !value);
      selection.set(0);
    } else if (event.name === "l" && !event.ctrl) {
      event.preventDefault();
      palette?.open({
        group: {
          title: "Quote language",
          list: LanguageSchema.options.map((value) => ({
            id: `quoteLanguage${value}`,
            display: value.replaceAll("_", " "),
            exec: () => {
              setLanguage(value);
              selection.set(0);
            },
          })),
        },
      });
    } else if (event.name === "r" && !event.ctrl) {
      event.preventDefault();
      quotes.reload();
      favorites.reload();
    } else if (event.name === "f" && selected() !== undefined) {
      event.preventDefault();
      const quote = selected();
      void action.run(async () => {
        if (quote === undefined || account === undefined) {
          throw new Error("Log in to favorite quotes");
        }
        await account.favorites.toggle(quote.language, quote.id);
      });
    } else if (event.name === "return" && selected() !== undefined) {
      event.preventDefault();
      const quote = selected();
      if (quote !== undefined) {
        void action.run(async () => {
          await test.selectQuote(quote.language, quote.id);
          router.replace("test");
        });
      }
    } else {
      selection.handleKey(event);
    }
  });
  return (
    <box flexDirection="column" gap={1}>
      <text fg={theme().colors.main}>
        quotes · {language().replaceAll("_", " ")} ·{" "}
        {onlyFavorites() ? "favorites" : "all"} · {items().length}
      </text>
      <TextInput
        field={search}
        label="/"
        placeholder="search text, source or quote id"
        focused={editing()}
      />
      <RemoteStatus
        loading={quotes.loading() || action.busy()}
        error={quotes.error() ?? favorites.error()}
      />
      <ListView
        items={items()}
        selected={selection.index()}
        height={Math.max(1, dimensions().height - 15)}
        empty="no quotes match"
        render={(quote, active) => (
          <text fg={active ? theme().colors.main : theme().colors.text}>
            {active ? "›" : " "}{" "}
            {isFavorite(quote.id, quote.language) ? "★" : " "} #{quote.id}{" "}
            {quote.source} ·{" "}
            {quote.text
              .replaceAll("\n", " ")
              .slice(0, Math.max(10, dimensions().width - 35))}
          </text>
        )}
      />
      <Show when={selected()}>
        {(quote) => (
          <text fg={theme().colors.sub} wrapMode="word" height={3}>
            {quote().text}
          </text>
        )}
      </Show>
      <text fg={theme().colors.sub}>
        ↑↓ select · / search · enter type · f favorite · v favorites · l
        language · r reload
      </text>
    </box>
  );
}
