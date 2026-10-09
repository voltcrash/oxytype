import type { ParentProps } from "solid-js";

import { useKeyboard, usePaste } from "@opentui/solid";
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
import { globalBindings, paletteBindings, quitBinding } from "./keymap";
import { KeyDispatcherContext } from "./screen-keys";

const navScreens = globalBindings.flatMap((it) =>
  it.action.type === "open" ? [it.action.screen] : [],
);
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

  return (
    <box
      flexDirection="column"
      width="100%"
      height="100%"
      padding={1}
      backgroundColor={colors().bg}
    >
      <box flexDirection="row" gap={2}>
        <text fg={colors().main} flexShrink={0}>
          oxytype
        </text>
        <For each={navScreens}>
          {(screen) => (
            <text
              fg={router.current() === screen ? colors().text : colors().sub}
              flexShrink={0}
            >
              {router.current() === screen
                ? `[${screenTitles[screen]}]`
                : screenTitles[screen]}
            </text>
          )}
        </For>
        <box flexGrow={1} />
        <text fg={colors().sub} flexShrink={0}>
          {theme().name.replaceAll("_", " ")}
        </text>
      </box>
      <box flexGrow={1} paddingTop={1}>
        {props.children}
      </box>
      <Show when={palette?.isOpen() === true && palette}>
        {(open) => <PaletteView palette={open()} />}
      </Show>
      <For each={notifications.entries()}>
        {(entry) => (
          <text
            fg={
              entry.level === "error"
                ? colors().error
                : entry.level === "success"
                  ? colors().main
                  : colors().text
            }
            wrapMode="word"
            flexShrink={0}
          >
            {entry.message}
          </text>
        )}
      </For>
      <box flexDirection="row" gap={2}>
        <For each={hintBindings}>
          {(binding) => (
            <text fg={colors().sub} flexShrink={0}>
              {formatKey(binding.key)} {binding.label}
            </text>
          )}
        </For>
      </box>
    </box>
  );
}
