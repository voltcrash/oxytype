import { createSignal } from "solid-js";
import { z } from "zod/v3";
import { serialize as serializeUrlSearchParams } from "zod-urlsearchparams";
import { createEffectOn } from "../hooks/effects";
import { replaceUrl } from "../navigation/navigation";
import { FaSolidIcon } from "../types/font-awesome";
import { getActivePage } from "./core";

const SettingsSectionSchema = z.enum([
  "behavior",
  "input",
  "sound",
  "caret",
  "appearance",
  "theme",
  "hideElements",
  "dangerZone",
]);
export type SettingsSection = z.infer<typeof SettingsSectionSchema>;

export const settingsSections: Record<
  SettingsSection,
  { icon: FaSolidIcon; text: string }
> = {
  behavior: { text: "behavior", icon: "fa-tools" },
  input: { text: "input", icon: "fa-keyboard" },
  sound: { text: "sound", icon: "fa-volume-up" },
  caret: { text: "caret", icon: "fa-i-cursor" },
  appearance: { text: "appearance", icon: "fa-palette" },
  theme: { text: "theme", icon: "fa-brush" },
  hideElements: { text: "hide elements", icon: "fa-eye-slash" },
  dangerZone: { text: "danger zone", icon: "fa-exclamation-triangle" },
};

export const SettingsUrlParamsSchema = z
  .object({
    tab: SettingsSectionSchema,
  })
  .partial();
type SettingsUrlParams = z.infer<typeof SettingsUrlParamsSchema>;

export const [getCurrentSettingsSection, setCurrentSettingsSection] =
  createSignal<SettingsSection>("behavior");

export function readSettingsGetParameters(
  params: SettingsUrlParams | undefined,
): void {
  if (params?.tab === undefined) return;

  setCurrentSettingsSection(params.tab);
}

createEffectOn(getCurrentSettingsSection, (tab) => {
  //only replace the url while on the settings page, otherwise the url-handler breaks
  if (getActivePage() !== "settings") return;
  const urlParams = serializeUrlSearchParams({
    schema: SettingsUrlParamsSchema,
    data: { tab },
  });
  void replaceUrl(`${window.location.pathname}?${urlParams.toString()}`);
});
