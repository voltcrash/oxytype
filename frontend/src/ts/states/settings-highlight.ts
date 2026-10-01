import { createSignal } from "solid-js";
export const [getHighlightedSetting, setHighlightedSetting] = createSignal<
  string | null
>(null);
const settings = new Map<string, () => void>();
export function registerSettingHighlight(
  key: string,
  highlight: () => void,
): () => void {
  settings.set(key, highlight);
  return () => {
    if (settings.get(key) === highlight) settings.delete(key);
  };
}
export function highlightSetting(key: string | null): void {
  setHighlightedSetting(null);
  if (key !== null) settings.get(key)?.();
}
