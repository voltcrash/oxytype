import { areWordsVisible, isReadAheadDisabled } from "../states/funbox";
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
              (name) =>
                ![
                  "blurred",
                  "opacity-25",
                  "blur-[4px]",
                  "read_ahead_disabled",
                  "hidden",
                ].includes(name),
            ),
          showOutOfFocusWarning() && "blurred opacity-25 blur-[4px]",
          isReadAheadDisabled() && "read_ahead_disabled",
          !areWordsVisible() && "hidden",
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
