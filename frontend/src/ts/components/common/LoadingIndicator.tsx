import { JSXElement, ParentProps } from "solid-js";

import { cn } from "../../utils/cn";

export function LoadingIndicator(
  props: ParentProps<{ class?: string }>,
): JSXElement {
  return (
    <div
      class={cn(
        "h-2 w-full max-w-80 overflow-hidden rounded bg-sub-alt",
        props.class,
      )}
      aria-hidden="true"
    >
      {props.children ?? (
        <div class="h-full w-full origin-left scale-x-35 rounded bg-main motion-safe:animate-loading-indicator"></div>
      )}
    </div>
  );
}
