import { spread } from "solid-js/web";

import { showOutOfFocusWarning } from "../states/test";
import { cn } from "../utils/cn";

// Called by TestPage's lifecycle; legacy word/funbox classes still coexist.
export function useWordsFocus(element: HTMLDivElement): void {
  spread(
    element,
    {
      get class() {
        return cn(
          element.className
            .split(/\s+/)
            .filter(
              (name) => !["blurred", "opacity-25", "blur-[4px]"].includes(name),
            ),
          showOutOfFocusWarning() && "blurred opacity-25 blur-[4px]",
        );
      },
      get style() {
        return { transition: showOutOfFocusWarning() ? "0.25s" : "none" };
      },
    },
    false,
    true,
  );
}
