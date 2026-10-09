import type { Config, ThemeName } from "@oxytype/schemas/configs";
import { ThemesList } from "@oxytype/typing-core/themes";
import { createEffect, createSignal, type Accessor } from "solid-js";
import { parseHex } from "./color";

/** A display override: random themes never overwrite the synced preset. */
export function createRandomTheme(
  config: Readonly<Config>,
  ready: Accessor<boolean>,
): Accessor<ThemeName | undefined> {
  const [name, setName] = createSignal<ThemeName>();
  createEffect(() => {
    const isReady = ready();
    const mode = config.randomTheme;
    const favorites = new Set([...config.favThemes]);
    if (mode === "off" || mode === "auto" || mode === "custom") {
      setName(undefined);
      return;
    }
    if (!isReady) return;
    const candidates = ThemesList.filter((theme) => {
      if (mode === "fav") return favorites.has(theme.name);
      if (mode === "light" || mode === "dark") {
        const { r, g, b } = parseHex(theme.bg);
        const light = (r * 299 + g * 587 + b * 114) / 1000 >= 128;
        return mode === "light" ? light : !light;
      }
      return true;
    });
    setName(candidates[Math.floor(Math.random() * candidates.length)]?.name);
  });
  return name;
}
