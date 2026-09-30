import { onCleanup, onMount } from "solid-js";

import { Config } from "../../config/store";
import { ModifierKeys } from "../../constants/modifier-keys";
import { isInputElementFocused } from "../../input/input-element";
import { getActivePage } from "../../states/core";
import { showErrorNotification } from "../../states/notifications";
import * as PageTransition from "../../states/page-transition";
import { getResultVisible } from "../../states/test";
import { focusWords } from "../../test/test-ui";
import { isDevEnvironment } from "../../utils/env";
import { isAnyPopupVisible } from "../../utils/misc";

export function GlobalEvents(): null {
  onMount(() => {
    const autofocus = (e: KeyboardEvent): void => {
      if (PageTransition.get() || e.key === undefined) return;
      if (
        isDevEnvironment() &&
        (document.activeElement as HTMLElement | null)?.dataset["uiElement"] ===
          "signalDevtoolsInput"
      ) {
        return;
      }

      if (
        getActivePage() === "test" &&
        !getResultVisible() &&
        !isInputElementFocused()
      ) {
        // Keep the expensive popup check outside the focused keystroke path.
        if (
          !isAnyPopupVisible() &&
          !["Enter", " ", "Escape", "Tab", ...ModifierKeys].includes(e.key) &&
          !e.metaKey &&
          !e.ctrlKey
        ) {
          focusWords();
          if (Config.showOutOfFocusWarning) e.preventDefault();
        }
      }
    };

    const preventSpaceScroll = (e: KeyboardEvent): void => {
      if (
        e.code === "Space" &&
        (e.target === document.body ||
          (e.target as HTMLElement)?.id === "result")
      ) {
        e.preventDefault();
      }
    };

    const previousError = window.onerror;
    const previousRejection = window.onunhandledrejection;
    const onError: OnErrorEventHandlerNonNull = (
      message,
      url,
      line,
      column,
      error,
    ): void => {
      if (isDevEnvironment()) {
        showErrorNotification(error?.message ?? "Undefined message", {
          customTitle: "DEV: Unhandled error",
          durationMs: 5000,
          important: true,
        });
        console.error({ message, url, line, column, error });
      }
    };
    const onRejection = (e: PromiseRejectionEvent): void => {
      if (isDevEnvironment()) {
        showErrorNotification(
          (e.reason as Error).message ?? e.reason ?? "Undefined message",
          {
            customTitle: "DEV: Unhandled rejection",
            durationMs: 5000,
            important: true,
          },
        );
      }
    };

    document.addEventListener("keydown", autofocus);
    window.addEventListener("keydown", preventSpaceScroll);
    window.onerror = onError;
    window.onunhandledrejection = onRejection;
    onCleanup(() => {
      document.removeEventListener("keydown", autofocus);
      window.removeEventListener("keydown", preventSpaceScroll);
      if (window.onerror === onError) window.onerror = previousError;
      if (window.onunhandledrejection === onRejection) {
        window.onunhandledrejection = previousRejection;
      }
    });
  });
  return null;
}
