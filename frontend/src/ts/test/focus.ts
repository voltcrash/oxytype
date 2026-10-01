import { batch } from "solid-js";

import * as Caret from "./caret";
import { setFocusCursorHidden } from "../states/app";
import { requestDebouncedAnimationFrame } from "../utils/debounced-animation-frame";
import { getFocus, setFocus } from "../states/test";

// withCursor is used on initial load to keep the pointer visible.
export function set(value: boolean, withCursor = false): void {
  if (value === getFocus()) return;
  requestDebouncedAnimationFrame("focus.set", () => {
    if (value === getFocus()) return;
    batch(() => {
      setFocus(value);
      setFocusCursorHidden(value && !withCursor);
    });
    if (value) {
      Caret.stopAnimation();
    } else {
      Caret.startAnimation();
    }
  });
}
