import { Show } from "solid-js";

import { SECONDARY_COMMAND_PALETTE_HOTKEY } from "../../input/hotkeys/command-palette-hotkey";
import { hotkeys } from "../../states/hotkeys";
import { isFirefox } from "../../utils/misc";
import { Kbd } from "../common/Kbd";

export function CommandPaletteHotkey() {
  return (
    <>
      <Kbd hotkey={hotkeys.commandPalette} />
      <Show
        when={
          !isFirefox() &&
          hotkeys.commandPalette !== SECONDARY_COMMAND_PALETTE_HOTKEY
        }
      >
        &nbsp;or&nbsp;
        <Kbd hotkey={SECONDARY_COMMAND_PALETTE_HOTKEY} />
      </Show>
    </>
  );
}
