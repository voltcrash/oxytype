import {
  createSignal,
  For,
  JSXElement,
  onCleanup,
  onMount,
  Show,
} from "solid-js";

import { getConfig } from "../../../../config/store";
import { getActivePage, getIsScreenshotting } from "../../../../states/core";
import { showModal } from "../../../../states/modals";
import { showNoticeNotification } from "../../../../states/notifications";
import { resultState } from "../../../../states/result";
import { getResultVisible } from "../../../../states/test";
import { toggleReplayDisplay } from "../../../../test/replay";
import { toggleResultWords } from "../../../../test/result";
import * as TestLogic from "../../../../test/test-logic";
import * as TestScreenshot from "../../../../test/test-screenshot";
import { FaObject } from "../../../../types/font-awesome";
import { cn } from "../../../../utils/cn";
import { Fa } from "../../../common/Fa";

export function ResultButtons(): JSXElement {
  // shift held: screenshot button downloads instead of copying
  const [shiftHeld, setShiftHeld] = createSignal(false);

  const onShift = (event: KeyboardEvent): void => {
    if (!(getResultVisible() && getActivePage() === "test")) return;
    if (event.key !== "Shift") return;
    setShiftHeld(event.type === "keydown");
  };

  onMount(() => {
    document.addEventListener("keydown", onShift);
    document.addEventListener("keyup", onShift);
  });
  onCleanup(() => {
    document.removeEventListener("keydown", onShift);
    document.removeEventListener("keyup", onShift);
  });

  const buttons: {
    id: string;
    label: string;
    icon: () => FaObject;
    class?: string;
    // hidden in glarses mode
    noStressHidden?: boolean;
    balloonBreak?: boolean;
    onClick: (event: MouseEvent) => void;
  }[] = [
    {
      id: "nextTestButton",
      label: "Next test",
      icon: () => ({ icon: "fa-chevron-right" }),
      class: "max-sm:col-span-2",
      onClick: () => void TestLogic.restart(),
    },
    {
      id: "restartTestButtonWithSameWordset",
      label: "Repeat test",
      icon: () => ({ icon: "fa-sync-alt" }),
      onClick: () => {
        if (getConfig.mode === "zen") {
          showNoticeNotification("Repeat test disabled in zen mode");
          return;
        }
        void TestLogic.restart({
          withSameWordset: true,
        });
      },
    },
    {
      id: "practiseWordsButton",
      label: "Practice words",
      icon: () => ({ icon: "fa-exclamation-triangle" }),
      onClick: () => {
        if (getConfig.mode === "zen") {
          showNoticeNotification("Practice words is unsupported in zen mode");
          return;
        }
        showModal("PractiseWords");
      },
    },
    {
      id: "showWordHistoryButton",
      label: "Toggle words history",
      icon: () => ({ icon: "fa-align-left" }),
      noStressHidden: true,
      onClick: () => toggleResultWords(),
    },
    {
      id: "watchReplayButton",
      label: "Watch replay",
      icon: () => ({ icon: "fa-backward" }),
      noStressHidden: true,
      onClick: () => toggleReplayDisplay(),
    },
    {
      id: "saveScreenshotButton",
      label: "Copy screenshot to clipboard\n(shift click to download)",
      icon: () =>
        shiftHeld()
          ? { icon: "fa-download" }
          : { icon: "fa-image", variant: "regular" },
      noStressHidden: true,
      balloonBreak: true,
      onClick: (event) => {
        if (event.shiftKey) {
          void TestScreenshot.download();
        } else {
          void TestScreenshot.copyToClipboard();
        }
        setShiftHeld(false);
      },
    },
  ];

  return (
    <>
      <Show when={resultState.retrySaving}>
        <button
          type="button"
          id="retrySavingResultButton"
          class="danger mx-auto mt-0 mb-4 flex"
          onClick={() => void TestLogic.retrySavingResult()}
        >
          <Fa icon="fa-redo" />
          Retry saving result
        </button>
      </Show>
      <div
        class={cn(
          "buttons col-[1/3] grid grid-flow-col justify-center gap-4 max-sm:grid-flow-row max-sm:grid-cols-[1fr_1fr]",
          getIsScreenshotting() && "hidden",
        )}
      >
        <For each={buttons}>
          {(button) => (
            <button
              type="button"
              class={cn(
                "text",
                button.class,
                button.noStressHidden && resultState.noStress && "hidden",
              )}
              id={button.id}
              aria-label={button.label}
              role="button"
              data-balloon-pos="down"
              data-balloon-break={button.balloonBreak ? "" : undefined}
              onClick={(event) => button.onClick(event)}
            >
              <Fa {...button.icon()} fixedWidth />
            </button>
          )}
        </For>
        {/* #watchVideoAdButton (fa-ad, "Watch video ad") disabled, see VideoAdPopup */}
      </div>
    </>
  );
}
