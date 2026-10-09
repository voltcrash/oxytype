import type { ParentProps } from "solid-js";

import { useKeyboard, usePaste, useTerminalDimensions } from "@opentui/solid";
import { For, Show, useContext } from "solid-js";

import type { GlobalAction } from "./keymap";

import { formatKey, matchesKey } from "../keys";
import { useNotifications } from "../notifications";
import { usePalette } from "../palette/palette";
import { PaletteView } from "../palette/palette-view";
import { useRouter } from "../router/router";
import { screenTitles } from "../router/screens";
import { useTypingTest } from "../test/typing-test";
import { useTheme } from "../theme/theme";
import { KeyHints } from "../ui/key-hints";
import { StyledLine } from "../ui/styled";
import { Tabs } from "../ui/tabs";
import { globalBindings, paletteBindings, quitBinding } from "./keymap";
import { KeyDispatcherContext } from "./screen-keys";

const navScreens = globalBindings.flatMap((it) =>
  it.action.type === "open" ? [it.action.screen] : [],
);
/** Wide enough for settings rows; wider terminals centre the column. */
const maxContentWidth = 120;
const hintBindings = [
  ...globalBindings,
  ...paletteBindings.slice(0, 1),
  quitBinding,
];

export function Shell(props: ParentProps<{ onQuit: () => void }>) {
  const router = useRouter();
  const dispatcher = useContext(KeyDispatcherContext);
  const theme = useTheme();
  const test = useTypingTest();
  const notifications = useNotifications();
  const palette = usePalette();
  const colors = () => theme().colors;
  const dimensions = useTerminalDimensions();
  usePaste((event) => {
    if (palette?.isOpen() !== true) return;
    event.preventDefault();
    event.stopPropagation();
    palette.paste(new TextDecoder().decode(event.bytes));
  });

  const run = (action: GlobalAction): void => {
    if (action.type === "quit") {
      props.onQuit();
    } else if (action.type === "back") {
      router.back();
    } else if (action.type === "palette") {
      if (palette?.isOpen() === true) palette.close();
      else palette?.open();
    } else {
      if (action.screen === "test" && test.status() === "finished") {
        void test.restart();
      }
      router.push(action.screen);
    }
  };

  useKeyboard(
    (event) => {
      if (event.eventType === "release") {
        dispatcher?.dispatch(event);
        return;
      }
      if (matchesKey(event, quitBinding.key)) {
        event.preventDefault();
        run(quitBinding.action);
        return;
      }
      const toggle = paletteBindings.find((it) => matchesKey(event, it.key));
      if (toggle !== undefined && palette !== undefined) {
        event.preventDefault();
        run(toggle.action);
        return;
      }
      if (palette?.isOpen() === true) {
        palette.handleKey(event);
        return;
      }
      dispatcher?.dispatch(event);
      if (event.defaultPrevented) return;
      const binding = globalBindings.find((it) => matchesKey(event, it.key));
      if (binding === undefined) return;
      event.preventDefault();
      run(binding.action);
    },
    { release: true },
  );

  /** Like the web's focus mode: chrome steps back while typing. */
  const focused = (): boolean =>
    router.current() === "test" && test.status() === "running";
  const sidePadding = (): number => (dimensions().width >= 100 ? 3 : 1);

  return (
    <box
      flexDirection="column"
      width="100%"
      height="100%"
      paddingTop={1}
      paddingBottom={1}
      paddingLeft={sidePadding()}
      paddingRight={sidePadding()}
      alignItems="center"
      backgroundColor={colors().bg}
    >
      <Show
        when={dimensions().width >= 80 && dimensions().height >= 20}
        fallback={
          <box flexDirection="column" gap={1} width="100%">
            <text fg={colors().main}>oxytype</text>
            <text fg={colors().text} wrapMode="word">
              Resize terminal to at least 80×20. Current: {dimensions().width}×
              {dimensions().height}.
            </text>
            <text fg={colors().sub}>Ctrl+C quit</text>
          </box>
        }
      >
        <box
          flexDirection="column"
          flexGrow={1}
          width="100%"
          maxWidth={maxContentWidth}
        >
          <box flexDirection="row" gap={2} flexShrink={0}>
            <StyledLine
              chunks={[
                {
                  text: "oxytype",
                  fg: focused() ? colors().sub : colors().main,
                  bold: true,
                },
              ]}
            />
            <Show when={!focused()}>
              <Tabs
                tabs={navScreens.map((screen) => ({
                  label: screenTitles[screen],
                  active:
                    router.current() === screen ||
                    (screen === "test" &&
                      (router.current() === "result" ||
                        router.current() === "replay")),
                }))}
              />
              <box flexGrow={1} />
              <text fg={colors().sub} flexShrink={0}>
                {theme().name.replaceAll("_", " ")}
              </text>
            </Show>
          </box>
          <box flexGrow={1} paddingTop={1}>
            {props.children}
          </box>
          <For each={notifications.entries()}>
            {(entry) => (
              <StyledLine
                wrap
                chunks={[
                  {
                    text: "▌ ",
                    fg:
                      entry.level === "error"
                        ? colors().error
                        : entry.level === "success"
                          ? colors().main
                          : colors().sub,
                  },
                  {
                    text: entry.message,
                    fg:
                      entry.level === "error" ? colors().error : colors().text,
                  },
                ]}
              />
            )}
          </For>
          <Show when={!focused()} fallback={<text> </text>}>
            <KeyHints
              hints={hintBindings.map((binding) => ({
                key: formatKey(binding.key),
                label: binding.label,
              }))}
            />
          </Show>
        </box>
        <Show when={palette?.isOpen() === true && palette}>
          {(open) => <PaletteView palette={open()} />}
        </Show>
      </Show>
    </box>
  );
}
