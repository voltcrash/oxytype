import type { ParentProps } from "solid-js";

import { useKeyboard } from "@opentui/solid";
import { For, useContext } from "solid-js";

import type { GlobalAction } from "./keymap";

import { formatKey, matchesKey } from "../keys";
import { useRouter } from "../router/router";
import { screenTitles } from "../router/screens";
import { useTheme } from "../theme/theme";
import { globalBindings, quitBinding } from "./keymap";
import { KeyDispatcherContext } from "./screen-keys";

const navScreens = globalBindings.flatMap((it) =>
  it.action.type === "open" ? [it.action.screen] : [],
);
const hintBindings = [...globalBindings, quitBinding];

export function Shell(props: ParentProps<{ onQuit: () => void }>) {
  const router = useRouter();
  const dispatcher = useContext(KeyDispatcherContext);
  const theme = useTheme();
  const colors = () => theme().colors;

  const run = (action: GlobalAction): void => {
    if (action.type === "quit") props.onQuit();
    else if (action.type === "back") router.back();
    else router.push(action.screen);
  };

  useKeyboard((event) => {
    if (matchesKey(event, quitBinding.key)) {
      event.preventDefault();
      run(quitBinding.action);
      return;
    }
    dispatcher?.dispatch(event);
    if (event.defaultPrevented) return;
    const binding = globalBindings.find((it) => matchesKey(event, it.key));
    if (binding === undefined) return;
    event.preventDefault();
    run(binding.action);
  });

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
