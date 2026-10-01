import { For, JSXElement, Show } from "solid-js";

import { resultState } from "../../../../states/result";
import { cn } from "../../../../utils/cn";
import { ResultCrown } from "./ResultCrown";
import { ResultDailyLeaderboard } from "./ResultDailyLeaderboard";
import { ResultQuoteActions } from "./ResultQuoteActions";
import { ResultTags } from "./ResultTags";

const topClass = "top mb-1 text-[1rem] leading-[1rem] text-sub";
const bottomClass = "bottom text-[2rem] leading-[2rem] text-main";
const bigTopClass = "top mb-1 text-[2rem] leading-[1.5rem] text-sub";
const bigBottomClass = "bottom text-[4rem] leading-[4rem] text-main";
const smallTopClass = cn(topClass, "flex items-center");
const smallBottomClass = "bottom text-[1rem] leading-[1rem] text-main";
// balloons would overflow the screen on narrow layouts
const moreStatsBottomClass =
  "max-sm:after:left-0! max-sm:after:transform-none!";
const subTextClass = "ml-[0.2rem] text-[0.75rem] leading-[0.75rem] text-sub";

function Lines(props: { lines: string[] | undefined }): JSXElement {
  return (
    <Show when={props.lines} fallback="-">
      {(lines) => (
        <For each={lines()}>
          {(line, i) => (
            <>
              <Show when={i() > 0}>
                <br />
              </Show>
              {line}
            </>
          )}
        </For>
      )}
    </Show>
  );
}

export function ResultStats(): JSXElement {
  const stats = () => resultState.stats;

  return (
    <>
      <div
        class={cn(
          "stats grid items-center justify-center gap-2 [grid-area:stats] [grid-template-areas:'wpm'_'acc']",
          "max-md:grid-cols-[1fr_1fr] max-md:justify-items-center max-md:[grid-template-areas:'wpm_acc']",
          "max-sm:w-max max-sm:grid-cols-[1fr] max-sm:justify-items-start max-sm:justify-self-center max-sm:[grid-template-areas:'wpm'_'acc']",
          resultState.noStress && "hidden",
        )}
      >
        <div class="group wpm [grid-area:wpm]">
          <div class={cn(bigTopClass, "flex")}>
            <div class="text">{stats()?.typingSpeedUnit ?? "wpm"}</div>
            <ResultCrown />
          </div>
          <div
            class={bigBottomClass}
            aria-label={stats()?.wpm.ariaLabel}
            data-balloon-pos="up"
          >
            {stats()?.wpm.text ?? "-"}
          </div>
        </div>
        <div class="group acc [grid-area:acc]">
          <div class={bigTopClass}>acc</div>
          <div
            class={bigBottomClass}
            aria-label={stats()?.acc.ariaLabel}
            data-balloon-pos="up"
            data-balloon-break={stats()?.acc.balloonBreak ? "" : undefined}
          >
            {stats()?.acc.text ?? "-"}
          </div>
        </div>
      </div>
      <div
        class={cn(
          "stats morestats grid grid-flow-col items-start justify-between gap-x-8 gap-y-2 [grid-area:morestats]",
          "max-lg:grid-cols-[repeat(3,max-content)] max-lg:grid-rows-[1fr_1fr]",
          "max-md:grid-cols-[1fr_1fr] max-md:grid-rows-[1fr_1fr_1fr] max-md:justify-items-start max-md:gap-4 max-md:[grid-template-areas:'wpm_acc']",
          "max-sm:[grid-template-areas:'wpm'_'acc']",
          "max-xs:grid-flow-row max-xs:grid-cols-[1fr] max-xs:grid-rows-none",
          resultState.noStress && "hidden",
        )}
      >
        <div class="group testType">
          <div class={topClass}>test type</div>
          <div
            class={cn(
              "bottom text-[1rem] leading-[1.25] text-main",
              moreStatsBottomClass,
            )}
          >
            <Lines lines={stats()?.testType} />
          </div>
          <ResultTags
            topClass={smallTopClass}
            bottomClass={cn(
              "bottom text-[1rem] leading-[1.25] text-main",
              moreStatsBottomClass,
            )}
          />
        </div>
        <div
          class={cn(
            "group info",
            (stats()?.other.length ?? 0) === 0 && "hidden",
          )}
        >
          <div class={smallTopClass}>other</div>
          <div class={cn(smallBottomClass, moreStatsBottomClass)}>
            <Lines lines={stats()?.other} />
          </div>
        </div>
        <div class="group raw">
          <div class={topClass}>raw</div>
          <div
            class={cn(bottomClass, moreStatsBottomClass)}
            aria-label={stats()?.raw.ariaLabel}
            data-balloon-pos="up"
          >
            {stats()?.raw.text ?? "-"}
          </div>
        </div>
        <div class="group key">
          <div class={topClass}>characters</div>
          <div
            class={cn(bottomClass, moreStatsBottomClass)}
            aria-label={"correct\nincorrect\nextra\nmissed"}
            data-balloon-break=""
            data-balloon-pos="up"
          >
            {stats()?.characters ?? "-"}
          </div>
        </div>
        <div class="group consistency">
          <div class={topClass}>consistency</div>
          <div
            class={cn(bottomClass, moreStatsBottomClass)}
            aria-label={stats()?.consistency.ariaLabel}
            data-balloon-pos="up"
          >
            {stats()?.consistency.text ?? "-"}
          </div>
        </div>
        <div class="group time">
          <div class={topClass}>time</div>
          <div
            class={cn(bottomClass, moreStatsBottomClass)}
            aria-label={stats()?.time.ariaLabel}
            data-balloon-pos="up"
          >
            <div class="text">{stats()?.time.text ?? "-"}</div>
            <div class={cn("afk", subTextClass)}>{stats()?.time.afk}</div>
            <div class={cn("timeToday", subTextClass)}>
              {resultState.timeToday}
            </div>
          </div>
        </div>
        <ResultDailyLeaderboard
          topClass={topClass}
          bottomClass={cn(bottomClass, moreStatsBottomClass)}
        />
        <div
          class={cn(
            "group source max-w-[30rem]",
            stats()?.source === undefined && "hidden",
          )}
        >
          <div class={smallTopClass}>
            <span class="mr-[0.5em]">source</span>
            <ResultQuoteActions />
          </div>
          <div class={cn(smallBottomClass, moreStatsBottomClass)}>
            {stats()?.source ?? "-"}
          </div>
        </div>
      </div>
    </>
  );
}
