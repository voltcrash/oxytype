import { AnimationParams } from "animejs";
import { JSXElement } from "solid-js";

import {
  getBarAnimation,
  getMode,
  getText,
  isTextVisible,
} from "../../states/loading-page";
import { cn } from "../../utils/cn";
import { Anime } from "../common/anime";
import { Fa } from "../common/Fa";
import { LoadingIndicator } from "../common/LoadingIndicator";

export function LoadingPage(): JSXElement {
  const barAnimation = (): AnimationParams | undefined => {
    const bar = getBarAnimation();
    if (bar === undefined) return undefined;
    return {
      scaleX: bar.percentage / 100,
      duration: bar.duration,
      ease: "linear",
      onComplete: () => bar.onComplete(),
    };
  };

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
        <Anime
          class="h-full w-full origin-left scale-x-0 rounded bg-main"
          animation={barAnimation()}
        />
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
