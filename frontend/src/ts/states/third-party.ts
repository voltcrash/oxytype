import { createSignal } from "solid-js";

export const [isAnalyticsMarkupEnabled, setAnalyticsMarkupEnabled] =
  createSignal(false);
export const [isEgMarkupEnabled, setEgMarkupEnabled] = createSignal(false);
export const [getRampScriptUrl, setRampScriptUrl] = createSignal<string>();
