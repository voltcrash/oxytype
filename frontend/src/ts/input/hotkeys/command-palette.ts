import { hotkeys } from "../../states/hotkeys";
import { showModal } from "../../states/modals";
import { isAnyPopupVisible } from "../../states/overlay-visibility";
import { SECONDARY_COMMAND_PALETTE_HOTKEY } from "./command-palette-hotkey";
import { createHotkey } from "./utils";

function openCommandPalette(): void {
  if (isAnyPopupVisible()) return;
  showModal("Commandline");
}

createHotkey(() => hotkeys.commandPalette, openCommandPalette);
createHotkey(SECONDARY_COMMAND_PALETTE_HOTKEY, openCommandPalette, () => ({
  // the configured hotkey already registers it
  enabled: hotkeys.commandPalette !== SECONDARY_COMMAND_PALETTE_HOTKEY,
}));
