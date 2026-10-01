import { NavigateOptions } from "../events/navigation";
import * as PageTransition from "../states/page-transition";
import { showNoticeNotification } from "../states/notifications";
import {
  isTestActive,
  isTestRestarting,
  isResultCalculating,
} from "../states/test";
import { isFunboxActive } from "../test/funbox/list";

export function canNavigate(options: NavigateOptions = {}): boolean {
  if (
    !options.force &&
    (isTestRestarting() || isResultCalculating() || PageTransition.get())
  ) {
    return false;
  }

  if (isTestActive() && isFunboxActive("no_quit")) {
    showNoticeNotification(
      "No quit funbox is active. Please finish the test.",
      { important: true },
    );
    return false;
  }

  return true;
}
