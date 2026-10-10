import { animate } from "animejs";
import { createEffect, JSXElement, onCleanup } from "solid-js";

import { useRef } from "../../hooks/useRef";
import {
  getBarAnimation,
  getMode,
  getText,
  isTextVisible,
} from "../../states/loading-page";
import { cn } from "../../utils/cn";
import { applyReducedMotion } from "../../utils/misc";
import { Fa } from "../common/Fa";
import { LoadingIndicator } from "../common/LoadingIndicator";

export function LoadingPage(): JSXElement {
  const [ref, fill] = useRef<HTMLDivElement>();
  createEffect(() => {
    const bar = getBarAnimation();
    const element = fill();
    if (element === undefined) return;
    if (bar === undefined) {
      element.style.transform = "scaleX(0)";
      return;
    }
    const animation = animate(element, {
      scaleX: bar.percentage / 100,
      duration: applyReducedMotion(bar.duration),
      ease: "linear",
      onComplete: () => bar.onComplete(),
    });
    onCleanup(() => {
      animation.cancel();
      bar.onComplete();
    });
  });

  return (
    <div
      class="grid w-full justify-items-center gap-4 text-center"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={getMode() === "error" ? "Loading failed" : "Loading"}
    >
      <LoadingIndicator
        class={cn(
          "col-start-1 row-start-1 self-center",
          getMode() !== "spinner" && "invisible",
        )}
      />
      <div
        class={cn(
          "col-start-1 row-start-1 h-8 text-[2rem] text-error",
          getMode() !== "error" && "invisible",
        )}
        aria-hidden="true"
      >
        <Fa icon="fa-times" fixedWidth />
      </div>
      <LoadingIndicator
        class={cn(
          "col-start-1 row-start-1 self-center",
          getMode() !== "bar" && "invisible",
        )}
      >
        <div
          ref={ref}
          class="h-full w-full origin-left scale-x-0 rounded bg-main"
        ></div>
      </LoadingIndicator>
      <div
        class={cn(
          "row-start-2 min-h-[1.25em] w-full wrap-break-word",
          !isTextVisible() && "invisible",
        )}
      >
        {getText()}
      </div>
    </div>
  );
}
