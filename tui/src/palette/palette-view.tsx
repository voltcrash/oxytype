import { useTerminalDimensions } from "@opentui/solid";
import { Show } from "solid-js";

import type { Palette, PaletteItem } from "./palette";

import { useTheme } from "../theme/theme";
import { ListView } from "../ui/list-view";
import { StyledLine } from "../ui/styled";
import { TextInput } from "../ui/text-input";

export function PaletteView(props: { palette: Palette }) {
  const theme = useTheme();
  const dimensions = useTerminalDimensions();
  const colors = (): ReturnType<typeof theme>["colors"] => theme().colors;
  const width = (): number =>
    Math.max(20, Math.min(78, dimensions().width - 4));
  const listHeight = (): number =>
    Math.max(3, Math.min(14, dimensions().height - 10));
  const row = (item: PaletteItem, selected: boolean) => {
    const label = props.palette.usingSingleList() ? item.path : item.display;
    return (
      <StyledLine
        chunks={[
          {
            text: item.active?.() === true ? "● " : "  ",
            fg: colors().main,
            bg: selected ? colors().subAlt : undefined,
          },
          {
            text: label,
            fg: selected ? colors().text : colors().sub,
            bg: selected ? colors().subAlt : undefined,
          },
          ...(item.note === undefined
            ? []
            : [
                {
                  text: ` · ${item.note}`,
                  fg: colors().sub,
                  bg: selected ? colors().subAlt : undefined,
                },
              ]),
        ]}
      />
    );
  };
  return (
    <box
      position="absolute"
      top={2}
      left={Math.max(0, Math.floor((dimensions().width - width()) / 2))}
      width={width()}
      zIndex={10}
      flexDirection="column"
      border
      borderColor={colors().sub}
      backgroundColor={colors().bg}
      paddingLeft={1}
      paddingRight={1}
    >
      <Show when={props.palette.title() !== ""}>
        <text fg={colors().main}>{props.palette.title()}</text>
      </Show>
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
      <text fg={colors().sub}>
        {props.palette.mode() === "input"
          ? "enter confirm · esc back"
          : "enter select · tab/arrows move · esc back"}
      </text>
    </box>
  );
}
