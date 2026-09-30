import { JSXElement, onMount, Show } from "solid-js";

import {
  resultState,
  resultWordHighlightEvent,
  setResultElements,
} from "../../../../states/result";
import { Advertisement } from "../../../common/Advertisement";
import { Fa } from "../../../common/Fa";
import { ResultButtons } from "./ResultButtons";
import { ResultChart } from "./ResultChart";
import { ResultLoginTip } from "./ResultLoginTip";
import { ResultReplay } from "./ResultReplay";
import { ResultStats } from "./ResultStats";
import { ResultWatermark } from "./ResultWatermark";
import { ResultWordsHistory } from "./ResultWordsHistory";

export function Result(): JSXElement {
  let resultEl: HTMLDivElement | undefined;
  let wrapperEl: HTMLDivElement | undefined;

  onMount(() => {
    setResultElements(resultEl as HTMLDivElement, wrapperEl as HTMLDivElement);
  });

  return (
    // class stays static: result.ts/test-ui show, hide and fade #result.
    // col-[full-width]: the mount breaks `.content-grid > .full-width`
    <div
      id="result"
      ref={(el) => (resultEl = el)}
      class="content-grid full-width col-[full-width] hidden outline-none focus:outline-none focus-visible:outline-none [&.noBalloons_[aria-label][data-balloon-pos]]:before:hidden [&.noBalloons_[aria-label][data-balloon-pos]]:after:hidden"
      tabIndex={-1}
    >
      <Show when={resultState.noStress}>
        <div class="noStressMessage col-[1/3] pb-8 text-center text-[2rem]">
          <Fa icon="fa-check" />
        </div>
      </Show>
      <div
        ref={(el) => (wrapperEl = el)}
        class="wrapper grid grid-cols-[auto_1fr] items-center gap-4 [grid-template-areas:'stats_chart'_'morestats_morestats'] max-md:grid-cols-[1fr] max-md:[grid-template-areas:'stats'_'chart'_'morestats'] [:where(&)_button]:p-[1em_2em]"
      >
        <ResultStats />
        <ResultChart
          onHighlightWords={(firstWordIndex, lastWordIndex) =>
            resultWordHighlightEvent.dispatch({
              type: "highlight",
              firstWordIndex,
              lastWordIndex,
            })
          }
          onHoverChange={(hovering) =>
            resultWordHighlightEvent.dispatch({ type: "hoverChart", hovering })
          }
        />
        <div class="bottom col-[1/-1]">
          <ResultWordsHistory />
          <ResultReplay />
          <ResultButtons />
        </div>
        <ResultLoginTip />
        <ResultWatermark />
      </div>
      <div class="full-width mt-4">
        <Advertisement
          id="ad-result"
          visible={["result", "on", "sellout"]}
          staticVisibility
          withText
          hideWhileScreenshotting
        />
      </div>
    </div>
  );
}
