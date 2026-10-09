import { Client } from "@oxytype/schemas/shared";
import { createUniqueId, For, JSXElement } from "solid-js";

import { cn } from "../../utils/cn";
import { Fa } from "./Fa";

export function ClientToggle(props: {
  value: Client;
  onChange: (client: Client) => void;
}): JSXElement {
  const name = createUniqueId();
  return (
    <fieldset class="flex w-fit flex-wrap items-center gap-2 rounded bg-sub-alt p-2">
      <legend class="sr-only">typing client</legend>
      <For each={["web", "tui"] as const}>
        {(client) => (
          <label class="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={client}
              checked={props.value === client}
              onChange={() => props.onChange(client)}
              class="peer sr-only"
            />
            <span
              class={cn(
                "flex items-center gap-2 rounded px-4 py-2 text-sub transition-colors hover:text-text peer-focus-visible:ring-2 peer-focus-visible:ring-main",
                props.value === client && "bg-main text-bg hover:text-bg",
              )}
            >
              <Fa icon={client === "web" ? "fa-globe" : "fa-terminal"} />
              {client === "web" ? "Web" : "TUI"}
            </span>
          </label>
        )}
      </For>
    </fieldset>
  );
}
