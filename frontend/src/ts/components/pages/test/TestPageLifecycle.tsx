import { onCleanup, onMount } from "solid-js";

import { Config } from "../../../config/store";
import { isInputElementFocused } from "../../../input/input-element";
import {
  getResultVisible,
  isTestActive,
  setTestFocusState,
} from "../../../states/test";
import * as Caret from "../../../test/caret";
import { restart } from "../../../test/test-logic";

export function TestPageLifecycle(props: { input: HTMLTextAreaElement }): null {
  onMount(() => {
    const focus = (): void => {
      if (!isInputElementFocused()) return;
      if (!getResultVisible() && Config.showOutOfFocusWarning) {
        setTestFocusState("focused");
      }
      Caret.show(true);
    };
    const focusout = (): void => {
      if (!isInputElementFocused()) setTestFocusState("unfocused");
      Caret.hide();
    };
    const windowBlur = (): void => setTestFocusState("unfocusedWindow");
    const windowFocus = (): void => {
      if (
        !isTestActive() &&
        !getResultVisible() &&
        (Config.mode === "time" || Config.mode === "words")
      ) {
        void restart({ noAnim: true });
      }
    };
    const visibilityChange = (): void => {
      if (document.visibilityState === "hidden") windowBlur();
      if (document.visibilityState === "visible") windowFocus();
    };
    const input = props.input;
    input.addEventListener("focus", focus);
    input.addEventListener("focusout", focusout);
    window.addEventListener("blur", windowBlur);
    window.addEventListener("focus", windowFocus);
    document.addEventListener("visibilitychange", visibilityChange);
    onCleanup(() => {
      input.removeEventListener("focus", focus);
      input.removeEventListener("focusout", focusout);
      window.removeEventListener("blur", windowBlur);
      window.removeEventListener("focus", windowFocus);
      document.removeEventListener("visibilitychange", visibilityChange);
    });
  });
  return null;
}
