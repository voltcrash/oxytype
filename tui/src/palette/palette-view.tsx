import { RGBA } from "@opentui/core";
import { useTerminalDimensions } from "@opentui/solid";
import { Show } from "solid-js";

import type { Chunk } from "../ui/styled";
import type { Palette, PaletteItem } from "./palette";

import { useTheme } from "../theme/theme";
import { KeyHints } from "../ui/key-hints";
import { ListView } from "../ui/list-view";
import { StyledLine } from "../ui/styled";
import { TextInput } from "../ui/text-input";

export function PaletteView(props: { palette: Palette }) {
  const theme = useTheme();
  const dimensions = useTerminalDimensions();
  const colors = (): ReturnType<typeof theme>["colors"] => theme().colors;
  const width = (): number =>
    Math.max(20, Math.min(78, dimensions().width - 4));
  const top = (): number => Math.max(1, Math.floor(dimensions().height / 6));
  /** Leaves room for the border, input, rule, count and hints. */
  const listHeight = (): number =>
    Math.max(3, Math.min(14, dimensions().height - top() - 8));
  /** Inner width: the border and one column of padding on each side. */
  const inner = (): number => width() - 4;
  const row = (item: PaletteItem, selected: boolean) => {
    const label = props.palette.usingSingleList() ? item.path : item.display;
    const bg = selected ? colors().subAlt : undefined;
    const chunks: Chunk[] = [
      { text: selected ? "▌" : " ", fg: colors().main, bg },
      { text: item.active?.() === true ? "● " : "  ", fg: colors().main, bg },
      { text: label, fg: selected ? colors().text : colors().sub, bg },
      ...(item.note === undefined
        ? []
        : [{ text: `  ${item.note}`, fg: colors().sub, bg }]),
    ];
    const used = chunks.reduce((sum, it) => sum + it.text.length, 0);
    return (
      <StyledLine
        chunks={
          selected && used < inner()
            ? [...chunks, { text: " ".repeat(inner() - used), bg }]
            : chunks
        }
      />
    );
  };
  const dimmed = (): RGBA => {
    const [r, g, b] = colors().bg.toInts();
    return RGBA.fromInts(r, g, b, 190);
  };
  return (
    <box
      position="absolute"
      top={0}
      left={0}
      width="100%"
      height="100%"
      zIndex={10}
      backgroundColor={dimmed()}
      alignItems="center"
      paddingTop={top()}
    >
      <box
        width={width()}
        flexDirection="column"
        border
        borderStyle="rounded"
        borderColor={colors().sub}
        title={
          props.palette.title() === ""
            ? " commands "
            : ` ${props.palette.title()} `
        }
        titleColor={colors().main}
        backgroundColor={colors().bg}
        paddingLeft={1}
        paddingRight={1}
      >
        <TextInput
          field={props.palette.field}
          label={props.palette.mode() === "input" ? "›" : ">"}
          placeholder={
            props.palette.mode() === "input"
              ? ""
              : props.palette.usingSingleList()
                ? "type to search all commands"
                : "type to search"
          }
        />
        <text fg={colors().subAlt}>{"─".repeat(inner())}</text>
        <Show when={props.palette.error()}>
          {(error) => <text fg={colors().error}>{error()}</text>}
        </Show>
        <Show when={props.palette.mode() === "search"}>
          <ListView
            items={props.palette.items()}
            selected={props.palette.selection.index()}
            height={listHeight()}
            empty={
              props.palette.usingSingleList() &&
              props.palette.field.value().replace(/^>/, "").trim() === ""
                ? "start typing to search"
                : "no commands found"
            }
            render={row}
          />
        </Show>
        <KeyHints
          hints={
            props.palette.mode() === "input"
              ? [
                  { key: "enter", label: "confirm" },
                  { key: "esc", label: "back" },
                ]
              : [
                  { key: "enter", label: "select" },
                  { key: "tab/↑↓", label: "move" },
                  { key: "esc", label: "back" },
                ]
          }
        />
      </box>
    </box>
  );
}
