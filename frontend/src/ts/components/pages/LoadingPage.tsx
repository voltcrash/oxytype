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

export function LoadingPage(): JSXElement {
  const barAnimation = (): AnimationParams | undefined => {
    const bar = getBarAnimation();
    if (bar === undefined) return undefined;
    return {
      width: `${bar.percentage}%`,
      duration: bar.duration,
      onComplete: () => bar.onComplete(),
    };
  };

  return (
    <div class="grid gap-4 text-center">
      <div
        class={cn("text-[2rem] text-main", getMode() !== "spinner" && "hidden")}
      >
        <Fa icon="fa-circle-notch" fixedWidth spin />
      </div>
      <div
        class={cn("text-[2rem] text-error", getMode() !== "error" && "hidden")}
      >
        <Fa icon="fa-times" fixedWidth />
      </div>
      <div
        class={cn(
          "h-2 w-full max-w-80 justify-self-center rounded bg-sub-alt",
          getMode() !== "bar" && "hidden",
        )}
      >
        <Anime
          class="h-full w-1/2 rounded bg-main"
          animation={barAnimation()}
          respectReducedMotion={false}
        />
      </div>
      <div
        class={cn(
          "min-h-[1.25em] wrap-break-word",
          !isTextVisible() && "hidden",
        )}
      >
        {getText()}
      </div>
    </div>
  );
}
