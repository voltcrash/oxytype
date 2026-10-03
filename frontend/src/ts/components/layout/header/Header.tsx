import { JSXElement, Show } from "solid-js";

import { PageName } from "../../../pages/page";
import { getActivePage, getIsScreenshotting } from "../../../states/core";
import { getFocus } from "../../../states/test";
import { cn } from "../../../utils/cn";
import { Logo } from "./Logo";
import { Nav } from "./Nav";

// long pages with a sticky sidebar, where the header stays in place and only
// the page content scrolls
const stickyHeaderPages: PageName[] = ["settings", "accountSettings"];

export function Header(): JSXElement {
  const isSticky = (): boolean => stickyHeaderPages.includes(getActivePage());

  return (
    <header
      class={cn(
        "flex place-items-center gap-2",
        {
          "opacity-0": getIsScreenshotting(),
        },
        // padded into #app's top padding and the gap below it (negative
        // margins keep the layout unchanged), so the stuck header has room
        isSticky() && "sticky top-0 z-20 -mt-8 -mb-4 pt-8 pb-4",
      )}
      data-ui-element="header"
      data-focused={getFocus() ? "" : undefined}
    >
      <Show when={isSticky()}>
        {/* full width background, with a soft edge that fades out the content
            scrolling underneath */}
        <div class="pointer-events-none absolute inset-y-0 left-1/2 -z-10 w-screen -translate-x-1/2 bg-bg"></div>
        <div class="pointer-events-none absolute top-full left-1/2 -z-10 h-8 w-screen -translate-x-1/2 bg-linear-to-b from-bg to-transparent"></div>
      </Show>
      <Logo />
      <Nav />
    </header>
  );
}
