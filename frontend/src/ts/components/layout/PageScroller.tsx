import { createEffect, JSXElement, onCleanup, ParentProps } from "solid-js";

import { useRef } from "../../hooks/useRef";
import { getActivePage } from "../../states/core";
import {
  getHeaderBottom,
  hasFixedHeader,
  setPageScroller,
} from "../../states/page-layout";
import { cn } from "../../utils/cn";

// wraps the page content and footer. normally it takes their place in the app
// grid and the window scrolls. on pages with a fixed header it becomes a full
// screen scroll container underneath the header instead, so overscroll only
// moves the content and the content scrolls under the header's soft edge
export function PageScroller(props: ParentProps): JSXElement {
  const [ref, element] = useRef<HTMLDivElement>();
  const isScroller = (): boolean => hasFixedHeader(getActivePage());

  createEffect(() => {
    setPageScroller(isScroller() ? element() : undefined);
  });

  // the window no longer scrolls on these pages, so don't let it rubber band
  createEffect(() => {
    document.documentElement.style.overscrollBehaviorY = isScroller()
      ? "none"
      : "";
  });

  onCleanup(() => {
    setPageScroller(undefined);
    document.documentElement.style.overscrollBehaviorY = "";
  });

  return (
    <div
      ref={ref}
      class={cn(
        "content-grid grid-rows-[1fr_auto] gap-y-8",
        // the top space is a margin on the content, not padding here: sticky
        // offsets inside a scroll container are measured from its padding
        isScroller()
          ? "fixed inset-0 z-10 overflow-y-auto overscroll-y-contain pb-8 [&>main]:mt-(--content-top) [&>main]:h-auto"
          : "full-width row-[content-start/top-end]",
      )}
      // the header's bottom edge includes its own bottom padding (1rem), so
      // this keeps the usual 2rem gap between the header and the content
      style={
        isScroller()
          ? { "--content-top": `calc(${getHeaderBottom()}px + 1rem)` }
          : undefined
      }
    >
      {props.children}
    </div>
  );
}
