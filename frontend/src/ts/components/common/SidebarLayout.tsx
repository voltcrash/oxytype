import { For, JSXElement, Show } from "solid-js";

import { useRef } from "../../hooks/useRef";
import { FaSolidIcon } from "../../types/font-awesome";
import { cn } from "../../utils/cn";
import { Button } from "./Button";
import { Separator } from "./Separator";

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
  // extra content below the items, split off by a separator
  footer?: JSXElement;
  // when set, shows a count next to each item and dims items without one
  counts?: Partial<Record<T, number>>;
  children: JSXElement;
}): JSXElement {
  const [contentRef, content] = useRef<HTMLDivElement>();

  const select = (key: T): void => {
    props.onSelect(key);
    // the sidebar stays in view while scrolling (or sits above the content on
    // mobile), so bring the top of the new content into view
    const top = content()?.getBoundingClientRect().top;
    if (top !== undefined && (top < 0 || top > window.innerHeight / 2)) {
      content()?.scrollIntoView({ block: "start" });
    }
  };

  return (
    <div class="content-grid flex flex-col gap-8 md:flex-row">
      <div class="w-full shrink-0 md:sticky md:top-8 md:w-60 md:self-start">
        {/* items are laid out in two columns on mobile to keep the sidebar short */}
        <nav class="grid grid-cols-2 gap-2 rounded-double bg-sub-alt p-4 md:flex md:max-h-[calc(100vh-4rem)] md:flex-col md:items-start md:gap-4 md:overflow-y-auto">
          <Show when={props.header !== undefined}>
            <div class="col-span-full w-full">{props.header}</div>
          </Show>
          <For each={Object.entries(props.items) as [T, SidebarItem][]}>
            {([key, item]) => (
              <Button
                text={item.text}
                variant="text"
                fa={{ icon: item.icon }}
                active={props.active === key}
                class={cn(
                  "justify-start text-left [--themable-button-active:var(--themable-button-text)]",
                  props.counts !== undefined &&
                    "w-full justify-start [&>span:last-child]:ml-auto",
                  props.counts !== undefined &&
                    (props.counts[key] ?? 0) === 0 &&
                    "opacity-50",
                )}
                onClick={() => select(key)}
              >
                <Show when={props.counts !== undefined}>
                  <span class="rounded bg-bg px-[0.5em] text-em-xs text-sub">
                    {props.counts?.[key] ?? 0}
                  </span>
                </Show>
              </Button>
            )}
          </For>
          <Show when={props.footer !== undefined}>
            {/* the larger gap balances the padding below the last item's label */}
            <div class="col-span-full grid w-full gap-6">
              {/* inset to line up with the item icons */}
              <Separator class="mx-2 w-auto bg-bg" />
              <div class="grid gap-2">{props.footer}</div>
            </div>
          </Show>
        </nav>
      </div>
      <div
        ref={contentRef}
        class="flex w-full flex-1 scroll-mt-8 flex-col gap-8"
      >
        {props.children}
      </div>
    </div>
  );
}
