import { ThemesList } from "@oxytype/typing-core/themes";

import { useConfig } from "../config/store";
import { useScreenKeys } from "../shell/screen-keys";
import { useTheme } from "../theme/theme";
import { Placeholder } from "./placeholder";

const themeNames = ThemesList.map((it) => it.name);

export function SettingsScreen() {
  const store = useConfig();
  const theme = useTheme();

  const cycleTheme = (step: number): void => {
    const index = themeNames.indexOf(store.config.theme);
    const next = themeNames.at((index + step) % themeNames.length);
    if (next === undefined) return;
    store.set("customTheme", false);
    store.set("theme", next);
  };

  useScreenKeys((event) => {
    if (event.name !== "left" && event.name !== "right") return;
    event.preventDefault();
    cycleTheme(event.name === "left" ? -1 : 1);
  });

  return (
    <Placeholder title="settings">
      <text fg={theme().colors.text}>
        theme {"<"} {theme().name.replaceAll("_", " ")} {">"}
      </text>
      <text fg={theme().colors.sub}>left/right to switch theme</text>
    </Placeholder>
  );
}
