import { setEgMarkupEnabled } from "../states/third-party";
/* oxlint-disable no-unsafe-member-access */
export function init(): void {
  setEgMarkupEnabled(true);
}

export function renderResult(widerThanBreakpoint: boolean): void {
  if (widerThanBreakpoint) {
    //@ts-expect-error 3rd party ad code
    // oxlint-disable-next-line no-unsafe-call
    window.egAps.render([
      "ad-result",
      "ad-vertical-left",
      "ad-vertical-right",
      "ad-footer",
    ]);
  } else {
    //@ts-expect-error 3rd party ad code
    // oxlint-disable-next-line no-unsafe-call
    window.egAps.render([
      "ad-result-small",
      "ad-vertical-left",
      "ad-vertical-right",
      "ad-footer-small",
    ]);
  }
}

export function reinstate(): boolean {
  try {
    //@ts-expect-error 3rd party ad code
    // oxlint-disable-next-line no-unsafe-call
    window.egAps.reinstate();
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

export async function refreshVisible(): Promise<void> {
  // The legacy refresh integration is disabled.
}
