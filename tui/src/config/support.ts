import type { Config } from "@oxytype/schemas/configs";

/**
 * Synced settings without a terminal effect. They stay editable so the web
 * client keeps the user's choice; `MISSING.md` explains each gap.
 */
const webOnly = new Set<keyof Config>([
  "burstHeatmap",
  "alwaysShowWordsHistory",
  "repeatedPace",
  "autoSwitchTheme",
  "themeLight",
  "themeDark",
  "showKeyTips",
  "showOutOfFocusWarning",
  "showTestModesNotice",
  "capsLockWarning",
  "showAverage",
  "showPb",
  "monkey",
  "soundVolume",
  "playSoundOnClick",
  "playSoundOnError",
  "playTimeWarning",
  "smoothCaret",
  "smoothLineScroll",
  "fontSize",
  "fontFamily",
  "customBackground",
  "customBackgroundSize",
  "customBackgroundFilter",
  "monkeyPowerLevel",
  "commandPaletteHotkey",
  "compositionDisplay",
  "oppositeShiftMode",
  "accountChart",
  "keymapStyle",
  "keymapSize",
]);

export function isWebOnly(key: keyof Config): boolean {
  return webOnly.has(key);
}
