import type { ParentProps } from "solid-js";

import { useKeyboard } from "@opentui/solid";
import { For, useContext } from "solid-js";

import type { GlobalAction } from "./keymap";

import { formatKey, matchesKey } from "../keys";
import { useRouter } from "../router/router";
import { screenTitles } from "../router/screens";
import { globalBindings, quitBinding } from "./keymap";
import { KeyDispatcherContext } from "./screen-keys";

const navBindings = globalBindings.filter((it) => it.action.type === "open");
const hintBindings = [
  ...globalBindings.filter((it) => it.action.type !== "open"),
  quitBinding,
];

export function Shell(props: ParentProps<{ onQuit: () => void }>) {
  const router = useRouter();
  const dispatcher = useContext(KeyDispatcherContext);

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
    <box flexDirection="column" width="100%" height="100%" padding={1}>
      <box flexDirection="row" gap={2}>
        <text>oxytype</text>
        <For each={navBindings}>
          {(binding) => (
            <text>
              {binding.action.type === "open" &&
              router.current() === binding.action.screen
                ? `[${binding.label}]`
                : binding.label}{" "}
              ({formatKey(binding.key)})
            </text>
          )}
        </For>
      </box>
      <box flexGrow={1} paddingTop={1}>
        {props.children}
      </box>
      <box flexDirection="row" gap={2}>
        <text>{screenTitles[router.current()]}</text>
        <For each={hintBindings}>
          {(binding) => (
            <text>
              {formatKey(binding.key)} {binding.label}
            </text>
          )}
        </For>
      </box>
    </box>
  );
}
