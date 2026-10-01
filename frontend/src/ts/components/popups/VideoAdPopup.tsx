import { animate } from "animejs";
import { JSXElement, Show, createSignal, onMount, onCleanup } from "solid-js";

import * as AdController from "../../controllers/ad-controller";
import {
  showErrorNotification,
  showNoticeNotification,
} from "../../states/notifications";
import { registerOverlayVisibility } from "../../states/overlay-visibility";
import { Fa } from "../common/Fa";

const [isVisible, setVisible] = createSignal(false);
let wrapperEl: HTMLDivElement | undefined;

export async function showVideoAdPopup(): Promise<void> {
  await AdController.checkAdblock();
  if (AdController.adBlock) {
    showNoticeNotification(
      "Looks like you're using an adblocker. Video ads will not work until you disable it.",
      {
        durationMs: 6000,
      },
    );
    return;
  }

  await AdController.checkCookieblocker();
  if (AdController.cookieBlocker) {
    showNoticeNotification(
      "Looks like you're using a cookie popup blocker. Video ads will not work without giving your consent through the popup.",
      {
        durationMs: 7000,
      },
    );
    return;
  }

  if (!isVisible()) setVisible(true);
}

function hide(): void {
  if (!isVisible() || wrapperEl === undefined) return;
  animate(wrapperEl, {
    opacity: [1, 0],
    duration: 125,
    onComplete: () => setVisible(false),
  });
}

export function egVideoListener(options: Record<string, string>): void {
  const event = options["event"];

  if (event === "started") {
    //
  } else if (event === "finished") {
    hide();
  } else if (event === "empty") {
    showErrorNotification("Failed to load video ad. Please try again later", {
      durationMs: 3000,
    });
    hide();
  }
}

function Content(): JSXElement {
  onMount(() => {
    onCleanup(
      registerOverlayVisibility(
        () => (wrapperEl?.getClientRects().length ?? 0) > 0,
      ),
    );
    if (wrapperEl === undefined) return;
    animate(wrapperEl, {
      opacity: [0, 1],
      duration: 125,
      onComplete: () => {
        // the ad sdk fills #eg-video-player once it's in the dom
        // @ts-expect-error 3rd party ad code
        // oxlint-disable-next-line no-unsafe-call no-unsafe-member-access
        window.dataLayer.push({ event: "EG_Video" });
      },
    });
  });

  return (
    <div
      id="videoAdPopupWrapper"
      ref={(el) => (wrapperEl = el)}
      class="fixed top-0 left-0 z-1000 flex h-full w-full items-center justify-center bg-[rgba(0,0,0,0.5)] p-8 opacity-0"
    >
      <div
        id="videoAdPopup"
        class="grid aspect-video w-full max-w-[1000px] gap-4 rounded-(--roundness) bg-bg p-8 [grid-template-areas:'middle']"
      >
        <div class="grid h-max place-items-center gap-4 self-center text-[2rem] text-main [grid-area:middle]">
          <Fa icon="fa-circle-notch" fixedWidth spin />
        </div>
        <div id="eg-video-player" class="[grid-area:middle]"></div>
      </div>
    </div>
  );
}

export function VideoAdPopup(): JSXElement {
  return (
    <Show when={isVisible()}>
      <Content />
    </Show>
  );
}
