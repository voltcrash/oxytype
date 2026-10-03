import { For, JSXElement, Show } from "solid-js";

import { FaSolidIcon } from "../../types/font-awesome";
import { cn } from "../../utils/cn";
import { Button } from "./Button";

export type SidebarItem = { text: string; icon: FaSolidIcon };

// page layout with a navigation sidebar on the left (stacked on top on mobile)
// and the active tab's content on the right
export function SidebarLayout<T extends string>(props: {
  items: Record<T, SidebarItem>;
  // no item is shown as active when undefined
  active: T | undefined;
  onSelect: (key: T) => void;
  // extra content above the items
  header?: JSXElement;
  // when set, shows a count next to each item and dims items without one
  counts?: Partial<Record<T, number>>;
  children: JSXElement;
}): JSXElement {
  return (
    <div class="content-grid flex flex-col gap-8 md:flex-row">
      <div class="w-full shrink-0 md:w-60">
        <nav class="flex flex-col gap-4 rounded-double bg-sub-alt p-4 md:items-start">
          {props.header}
          <For each={Object.entries(props.items) as [T, SidebarItem][]}>
            {([key, item]) => (
              <Button
                text={item.text}
                variant="text"
                fa={{ icon: item.icon }}
                active={props.active === key}
                class={cn(
                  "[--themable-button-active:var(--themable-button-text)]",
                  props.counts !== undefined &&
                    "w-full justify-start [&>span:last-child]:ml-auto",
                  props.counts !== undefined &&
                    (props.counts[key] ?? 0) === 0 &&
                    "opacity-50",
                )}
                onClick={() => props.onSelect(key)}
              >
                <Show when={props.counts !== undefined}>
                  <span class="rounded bg-bg px-[0.5em] text-em-xs text-sub">
                    {props.counts?.[key] ?? 0}
                  </span>
                </Show>
              </Button>
            )}
          </For>
        </nav>
      </div>
      <div class="flex w-full flex-1 flex-col gap-8">{props.children}</div>
    </div>
  );
}
