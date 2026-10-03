import { For, JSXElement } from "solid-js";

import { FaSolidIcon } from "../../types/font-awesome";
import { Button } from "./Button";

export type SidebarItem = { text: string; icon: FaSolidIcon };

// page layout with a navigation sidebar on the left (stacked on top on mobile)
// and the active tab's content on the right
export function SidebarLayout<T extends string>(props: {
  items: Record<T, SidebarItem>;
  active: T;
  onSelect: (key: T) => void;
  children: JSXElement;
}): JSXElement {
  return (
    <div class="content-grid flex flex-col gap-8 md:flex-row">
      <div class="w-full shrink-0 md:w-60">
        <nav class="flex flex-col gap-4 rounded-double bg-sub-alt p-4 md:items-start">
          <For each={Object.entries(props.items) as [T, SidebarItem][]}>
            {([key, item]) => (
              <Button
                text={item.text}
                variant="text"
                fa={{ icon: item.icon }}
                active={props.active === key}
                class="[--themable-button-active:var(--themable-button-text)]"
                onClick={() => props.onSelect(key)}
              />
            )}
          </For>
        </nav>
      </div>
      <div class="flex w-full flex-1 flex-col gap-8">{props.children}</div>
    </div>
  );
}
