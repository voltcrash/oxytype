import { useRenderer, useTerminalDimensions } from "@opentui/solid";
import { getDefaultConfig } from "@oxytype/typing-core/config/default-config";
import { createMemo, createSignal, For, Show } from "solid-js";

import type { SettingRow, SettingSection } from "../settings/rows";
import type { Chunk } from "../ui/styled";

import { useAccount } from "../account";
import { useAuth } from "../auth/store";
import { useConfig } from "../config/store";
import { configTools } from "../config/tools";
import { useNotifications } from "../notifications";
import { usePalette } from "../palette/palette";
import { isDefault } from "../settings/rows";
import { settingSections } from "../settings/sections";
import { useScreenKeys } from "../shell/screen-keys";
import { useTheme } from "../theme/theme";
import { listWindow } from "../ui/selection";
import { StyledLine } from "../ui/styled";
import { createTextField } from "../ui/text-field";
import { TextInput } from "../ui/text-input";

type Line =
  | { kind: "group"; title: string }
  | { kind: "row"; row: SettingRow; index: number };

const defaults = getDefaultConfig();

export function SettingsScreen() {
  const store = useConfig();
  const theme = useTheme();
  const palette = usePalette();
  const auth = useAuth();
  const account = useAccount();
  const dimensions = useTerminalDimensions();
  const colors = (): ReturnType<typeof theme>["colors"] => theme().colors;
  const renderer = useRenderer();
  const sections = settingSections({
    store,
    palette,
    loggedIn: () => auth?.user() !== undefined,
    account,
    tools: configTools({
      store,
      notifications: useNotifications(),
      copy: (text) => renderer.copyToClipboardOSC52(text),
    }),
  });
  const [sectionIndex, setSectionIndex] = createSignal(0);
  const [rowIndex, setRowIndex] = createSignal(0);
  const [searching, setSearching] = createSignal(false);
  const search = createTextField();

  const visibleSections = createMemo((): SettingSection[] =>
    sections.filter((section) => section.available?.() ?? true),
  );
  const section = (): SettingSection | undefined =>
    visibleSections()[Math.min(sectionIndex(), visibleSections().length - 1)];
  const matches = (row: SettingRow, query: string): boolean =>
    query
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .every((word) =>
        [row.title, row.description ?? "", row.keywords ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(word),
      );
  const lines = createMemo((): Line[] => {
    const query = search.value().trim();
    const groups = (
      query === ""
        ? (section()?.groups ?? [])
        : visibleSections().flatMap((it) => it.groups)
    ).filter((group) => group.available?.() ?? true);
    const result: Line[] = [];
    let index = 0;
    for (const group of groups) {
      const rows = group.rows.filter(
        (row) =>
          (row.available?.() ?? true) && (query === "" || matches(row, query)),
      );
      if (rows.length === 0) continue;
      result.push({ kind: "group", title: group.title });
      for (const row of rows) result.push({ kind: "row", row, index: index++ });
    }
    return result;
  });
  const rows = createMemo(() =>
    lines().flatMap((line) => (line.kind === "row" ? [line.row] : [])),
  );
  const selectedIndex = (): number =>
    Math.max(0, Math.min(rowIndex(), rows().length - 1));
  const selected = (): SettingRow | undefined => rows()[selectedIndex()];
  const listHeight = (): number => Math.max(3, dimensions().height - 11);
  const window = createMemo(() => {
    const line = lines().findIndex(
      (it) => it.kind === "row" && it.index === selectedIndex(),
    );
    return listWindow(lines().length, Math.max(0, line), listHeight());
  });

  const cycle = (row: SettingRow, step: number): void => {
    const choices = row.choices?.();
    if (choices === undefined || choices.length === 0) return;
    const active = choices.findIndex((choice) => choice.active);
    choices[(active + step + choices.length) % choices.length]?.select();
  };
  const reset = (row: SettingRow): void => {
    for (const key of row.resetKeys ?? []) {
      if (!isDefault(store, [key])) store.set(key, defaults[key]);
    }
  };
  const switchSection = (index: number): void => {
    const count = visibleSections().length;
    setSectionIndex(((index % count) + count) % count);
    setRowIndex(0);
  };

  useScreenKeys((event) => {
    if (event.eventType === "release") return;
    const row = selected();
    if (searching()) {
      if (event.name === "escape") {
        event.preventDefault();
        setSearching(false);
        search.set("");
        setRowIndex(0);
        return;
      }
      if (event.name === "return" || event.name === "down") {
        event.preventDefault();
        setSearching(false);
        return;
      }
      if (search.handleKey(event)) setRowIndex(0);
      return;
    }
    const step =
      event.name === "up" || event.name === "k"
        ? -1
        : event.name === "down" || event.name === "j"
          ? 1
          : event.name === "pageup"
            ? -listHeight()
            : event.name === "pagedown"
              ? listHeight()
              : 0;
    if (step !== 0 && !event.ctrl && !event.meta) {
      event.preventDefault();
      setRowIndex(
        Math.max(0, Math.min(rows().length - 1, selectedIndex() + step)),
      );
    } else if (
      (event.name === "left" || event.name === "h") &&
      row !== undefined
    ) {
      event.preventDefault();
      cycle(row, -1);
    } else if (
      (event.name === "right" || event.name === "l") &&
      !event.ctrl &&
      row !== undefined
    ) {
      event.preventDefault();
      cycle(row, 1);
    } else if (
      (event.name === "return" || event.name === "space") &&
      row !== undefined
    ) {
      event.preventDefault();
      if (row.activate !== undefined) row.activate();
      else cycle(row, 1);
    } else if (event.name === "tab") {
      event.preventDefault();
      switchSection(sectionIndex() + (event.shift ? -1 : 1));
    } else if (/^[1-9]$/.test(event.name) && !event.ctrl) {
      event.preventDefault();
      if (Number(event.name) <= visibleSections().length) {
        switchSection(Number(event.name) - 1);
      }
    } else if (event.name === "/" || event.sequence === "/") {
      event.preventDefault();
      setSearching(true);
    } else if (event.name === "r" && !event.ctrl && row !== undefined) {
      event.preventDefault();
      reset(row);
    } else if (event.name === "escape" && search.value() !== "") {
      event.preventDefault();
      search.set("");
      setRowIndex(0);
    }
  });

  const rowChunks = (row: SettingRow, active: boolean): Chunk[] => {
    const bg = active ? colors().subAlt : undefined;
    const title = row.title.padEnd(28).slice(0, 28);
    const choices = row.choices?.() ?? [];
    const modified = !isDefault(store, row.resetKeys ?? []);
    return [
      { text: modified ? "•" : " ", fg: colors().main, bg },
      { text: ` ${title} `, fg: active ? colors().text : colors().sub, bg },
      ...choices.flatMap((choice, index): Chunk[] => [
        ...(index === 0 ? [] : [{ text: " ", bg }]),
        {
          text: choice.active ? `[${choice.label}]` : ` ${choice.label} `,
          fg: choice.active ? colors().main : colors().sub,
          bg,
        },
      ]),
      ...(row.value === undefined
        ? []
        : [
            {
              text: `${choices.length > 0 ? "  " : ""}${row.value() ?? ""}`,
              fg: colors().text,
              bg,
            },
          ]),
      ...(row.note === undefined
        ? []
        : [{ text: `  ${row.note}`, fg: colors().sub, bg }]),
    ];
  };

  return (
    <box flexDirection="column" width="100%">
      <StyledLine
        chunks={visibleSections().flatMap((it, index): Chunk[] => [
          ...(index === 0 ? [] : [{ text: " " }]),
          {
            text:
              search.value() === "" && it === section()
                ? `[${it.title}]`
                : ` ${it.title} `,
            fg:
              search.value() === "" && it === section()
                ? colors().main
                : colors().sub,
          },
        ])}
      />
      <Show
        when={searching() || search.value() !== ""}
        fallback={<text> </text>}
      >
        <TextInput
          field={search}
          label="/"
          placeholder="search settings"
          focused={searching()}
        />
      </Show>
      <Show
        when={rows().length > 0}
        fallback={
          <text fg={colors().sub}>
            {`No settings match "${search.value().trim()}".`}
          </text>
        }
      >
        <box flexDirection="column" height={listHeight()} flexShrink={0}>
          <For each={lines().slice(window().start, window().end)}>
            {(line) => (
              <StyledLine
                chunks={
                  line.kind === "group"
                    ? [{ text: line.title, fg: colors().main }]
                    : rowChunks(line.row, line.index === selectedIndex())
                }
              />
            )}
          </For>
        </box>
      </Show>
      <box height={3} flexShrink={0}>
        <text fg={colors().sub} wrapMode="word">
          {selected()?.description ?? ""}
        </text>
      </box>
      <text fg={colors().sub}>
        ↑↓ select · ←→ change · enter edit · r reset · / search · tab section
      </text>
    </box>
  );
}
