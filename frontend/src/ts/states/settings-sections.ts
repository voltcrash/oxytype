import { createSignal } from "solid-js";
import { z } from "zod/v3";
import { serialize as serializeUrlSearchParams } from "zod-urlsearchparams";
import { createEffectOn } from "../hooks/effects";
import { replaceUrl } from "../navigation/navigation";
import { FaSolidIcon } from "../types/font-awesome";
import { getActivePage, isAuthenticated } from "./core";

const SettingsSectionSchema = z.enum([
  "behavior",
  "input",
  "sound",
  "caret",
  "appearance",
  "theme",
  "hideElements",
  "account",
  "dangerZone",
  "apeKeys",
  "blockedUsers",
]);
export type SettingsSection = z.infer<typeof SettingsSectionSchema>;

export const settingsSections: Record<
  SettingsSection,
  { icon: FaSolidIcon; text: string; requiresAuthentication?: boolean }
> = {
  behavior: { text: "behavior", icon: "fa-tools" },
  input: { text: "input", icon: "fa-keyboard" },
  sound: { text: "sound", icon: "fa-volume-up" },
  caret: { text: "caret", icon: "fa-i-cursor" },
  appearance: { text: "appearance", icon: "fa-palette" },
  theme: { text: "theme", icon: "fa-brush" },
  hideElements: { text: "hide elements", icon: "fa-eye-slash" },
  account: {
    text: "account",
    icon: "fa-user",
    requiresAuthentication: true,
  },
  blockedUsers: {
    text: "blocked users",
    icon: "fa-ban",
    requiresAuthentication: true,
  },
  apeKeys: {
    text: "API keys",
    icon: "fa-code",
    requiresAuthentication: true,
  },
  dangerZone: { text: "danger zone", icon: "fa-exclamation-triangle" },
};

export const SettingsUrlParamsSchema = z
  .object({
    tab: z.enum([...SettingsSectionSchema.options, "authentication"]),
  })
  .partial();
type SettingsUrlParams = z.infer<typeof SettingsUrlParamsSchema>;

export const [getCurrentSettingsSection, setCurrentSettingsSection] =
  createSignal<SettingsSection>("behavior");

export function getAvailableSettingsSections(): Partial<
  typeof settingsSections
> {
  return Object.fromEntries(
    Object.entries(settingsSections).filter(
      ([, section]) => !section.requiresAuthentication || isAuthenticated(),
    ),
  );
}

function isSectionAvailable(section: SettingsSection): boolean {
  return !settingsSections[section].requiresAuthentication || isAuthenticated();
}

export function readSettingsGetParameters(
  params: SettingsUrlParams | undefined,
): void {
  if (params?.tab === undefined) return;

  const section = params.tab === "authentication" ? "account" : params.tab;
  setCurrentSettingsSection(isSectionAvailable(section) ? section : "behavior");
}

createEffectOn(isAuthenticated, () => {
  if (!isSectionAvailable(getCurrentSettingsSection())) {
    setCurrentSettingsSection("behavior");
  }
});

createEffectOn(getCurrentSettingsSection, (tab) => {
  //only replace the url while on the settings page, otherwise the url-handler breaks
  if (getActivePage() !== "settings") return;
  const urlParams = serializeUrlSearchParams({
    schema: SettingsUrlParamsSchema,
    data: { tab },
  });
  void replaceUrl(`${window.location.pathname}?${urlParams.toString()}`);
});
