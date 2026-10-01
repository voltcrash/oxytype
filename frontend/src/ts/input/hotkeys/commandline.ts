import { hotkeys } from "../../states/hotkeys";
import { showModal } from "../../states/modals";
import { isAnyPopupVisible } from "../../states/overlay-visibility";
import { createHotkey } from "./utils";

function openCommandline(): void {
  if (isAnyPopupVisible()) return;
  showModal("Commandline");
}

createHotkey(() => hotkeys.commandline, openCommandline);
createHotkey("Mod+Shift+P", openCommandline);
