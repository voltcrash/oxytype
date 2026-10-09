import { useTerminalDimensions } from "@opentui/solid";
import { getAllFunboxes } from "@oxytype/funbox";
import { createMemo } from "solid-js";

import { useConfig } from "../config/store";
import { useNotifications } from "../notifications";
import { useScreenKeys } from "../shell/screen-keys";
import { terminalFunboxes, wordFunboxes } from "../test/funboxes";
import { useTheme } from "../theme/theme";
import { ListView } from "../ui/list-view";
import { createSelection } from "../ui/selection";
import { createTextField } from "../ui/text-field";
import { TextInput } from "../ui/text-input";

export function FunboxesScreen() {
  const store = useConfig();
  const theme = useTheme();
  const dimensions = useTerminalDimensions();
  const notifications = useNotifications();
  const search = createTextField();
  const items = createMemo(() =>
    getAllFunboxes().filter((it) =>
      `${it.name} ${it.alias ?? ""} ${it.description}`
        .toLowerCase()
        .includes(search.value().toLowerCase()),
    ),
  );
  const selection = createSelection(() => items().length);
  const selected = () => items()[selection.index()];
  useScreenKeys((event) => {
    if (event.eventType === "release") return;
    if (
      (event.name === "return" || event.name === "space") &&
      selected() !== undefined
    ) {
      event.preventDefault();
      const box = selected();
      if (box === undefined) return;
      if (!terminalFunboxes.has(box.name)) {
        notifications.notify(
          `${box.name} requires a browser; see terminal parity gaps`,
        );
        return;
      }
      const active = store.config.funbox;
      store.set(
        "funbox",
        active.includes(box.name)
          ? active.filter((name) => name !== box.name)
          : [...active, box.name],
      );
    } else if (event.name === "escape" && search.value() !== "") {
      event.preventDefault();
      search.set("");
      selection.set(0);
    } else if (!selection.handleKey(event) && search.handleKey(event)) {
      selection.set(0);
    }
  });
  return (
    <box flexDirection="column" gap={1}>
      <text fg={theme().colors.main}>funboxes · type to search</text>
      <TextInput field={search} placeholder="search funboxes" />
      <ListView
        items={items()}
        selected={selection.index()}
        height={Math.max(1, dimensions().height - 15)}
        render={(box) => (
          <text fg={theme().colors.text}>
            {store.config.funbox.includes(box.name) ? "[x]" : "[ ]"}{" "}
            {box.name.replaceAll("_", " ")} ·{" "}
            {wordFunboxes.has(box.name)
              ? "shared words"
              : terminalFunboxes.has(box.name)
                ? "terminal"
                : "browser only"}
          </text>
        )}
      />
      <text fg={theme().colors.sub} wrapMode="word" height={3}>
        {selected()?.description}
      </text>
      <text fg={theme().colors.sub}>
        ↑↓ select · enter toggle · shared compatibility and forced settings
        apply
      </text>
    </box>
  );
}
