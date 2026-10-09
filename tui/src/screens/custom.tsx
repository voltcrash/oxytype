import { usePaste, useTerminalDimensions } from "@opentui/solid";
import { CustomTextSettingsSchema } from "@oxytype/schemas/results";
import { createSignal } from "solid-js";

import { usePalette } from "../palette/palette";
import { useRouter } from "../router/router";
import { useScreenKeys } from "../shell/screen-keys";
import { useTypingTest } from "../test/typing-test";
import { useTheme } from "../theme/theme";
import { createAction } from "../ui/actions";
import { ListView } from "../ui/list-view";
import { createSelection } from "../ui/selection";
import { StyledLine } from "../ui/styled";
import { createTextField } from "../ui/text-field";

export function CustomScreen() {
  const test = useTypingTest();
  const library = test.texts;
  const palette = usePalette();
  const router = useRouter();
  const theme = useTheme();
  const dimensions = useTerminalDimensions();
  const action = createAction();
  const field = createTextField(test.customText.text.join(" "), {
    multiline: true,
    maxLength: 100_000,
  });
  const [editing, setEditing] = createSignal(false);
  const [settings, setSettings] = createSignal({ ...test.customText });
  const [savedId, setSavedId] = createSignal<string>();
  usePaste((event) => {
    if (event.defaultPrevented || palette?.isOpen() === true || !editing()) {
      return;
    }
    event.preventDefault();
    field.insert(new TextDecoder().decode(event.bytes));
  });
  const selection = createSelection(() => library.texts().length);
  const draft = () => ({
    ...settings(),
    text: field
      .value()
      .trim()
      .split(/ +/)
      .filter((it) => it !== ""),
  });
  const apply = async (): Promise<void> => {
    await test.setCustomText(CustomTextSettingsSchema.parse(draft()));
    router.replace("test");
  };
  const configure = (): void =>
    palette?.open({
      command: {
        id: "customOptions",
        display: "Custom text options (JSON)",
        input: {
          defaultValue: () =>
            JSON.stringify({
              mode: settings().mode,
              limit: settings().limit,
              pipeDelimiter: settings().pipeDelimiter,
            }),
          submit: (value) => {
            try {
              const parsed = CustomTextSettingsSchema.safeParse({
                ...(JSON.parse(value) as object),
                text: draft().text,
              });
              if (!parsed.success) {
                return "mode: repeat/random/shuffle; limit: {mode: word/time/section, value: number}; pipeDelimiter: boolean";
              }
              setSettings(parsed.data);
              return undefined;
            } catch {
              return "Enter a JSON object";
            }
          },
        },
      },
    });
  useScreenKeys((event) => {
    if (event.eventType === "release") return;
    if (editing()) {
      if (event.name === "escape") {
        event.preventDefault();
        setEditing(false);
      } else if (event.name === "f9") {
        event.preventDefault();
        field.insert("\n");
      } else if (event.ctrl && event.name === "return") {
        event.preventDefault();
        void action.run(apply);
      } else {
        field.handleKey(event);
      }
      return;
    }
    if (event.name === "e") {
      event.preventDefault();
      setEditing(true);
    } else if (event.name === "o") {
      event.preventDefault();
      configure();
    } else if (event.name === "return") {
      event.preventDefault();
      void action.run(apply);
    } else if (event.name === "s") {
      event.preventDefault();
      palette?.open({
        command: {
          id: "saveText",
          display: "Save custom text",
          input: {
            defaultValue: () =>
              library.texts().find((it) => it.id === savedId())?.name ?? "",
            submit: async (name) => {
              if (name.trim() === "" || name.trim().length > 64) {
                return "Enter a name (1–64 characters)";
              }
              library.save(
                name.trim(),
                CustomTextSettingsSchema.parse(draft()),
                savedId(),
              );
              await library.flush();
              return undefined;
            },
          },
        },
      });
    } else if (event.name === "l") {
      event.preventDefault();
      const saved = library.texts()[selection.index()];
      if (saved !== undefined) {
        field.set(saved.settings.text.join(" "));
        setSettings(saved.settings);
        setSavedId(saved.id);
      }
    } else if (event.name === "n") {
      event.preventDefault();
      field.set("");
      setSavedId(undefined);
      setEditing(true);
    } else if (event.name === "d") {
      event.preventDefault();
      const saved = library.texts()[selection.index()];
      if (saved === undefined) return;
      palette?.open({
        group: {
          title: `Delete ${saved.name}?`,
          list: [
            { id: "cancelDeleteText", display: "Cancel" },
            {
              id: "deleteText",
              display: "Delete text",
              exec: async () => {
                library.remove(saved.id);
                await library.flush();
              },
            },
          ],
        },
      });
    } else {
      selection.handleKey(event);
    }
  });
  const preview = () => {
    const chars = Array.from(field.value());
    const cursor = field.cursor();
    const width = Math.max(1, dimensions().width - 5);
    const start = Math.max(0, cursor - width * 2);
    return [
      { text: chars.slice(start, cursor).join(""), fg: theme().colors.text },
      {
        text: editing() ? (chars[cursor] ?? " ") : "",
        bg: theme().colors.caret,
        fg: theme().colors.bg,
      },
      {
        text: chars
          .slice(cursor + (editing() ? 1 : 0), start + width * 4)
          .join(""),
        fg: theme().colors.text,
      },
    ];
  };
  return (
    <box flexDirection="column" gap={1}>
      <text fg={theme().colors.main}>
        custom text · {settings().mode} · {settings().limit.value}{" "}
        {settings().limit.mode} · pipe {settings().pipeDelimiter ? "on" : "off"}
      </text>
      <box height={5}>
        <StyledLine chunks={preview()} wrap />
      </box>
      <text fg={theme().colors.sub}>
        {editing()
          ? "typing · enter newline · F9 newline · tab literal tab · esc finish editing"
          : "e edit · n new · o options · enter type · s save · l load · d delete"}
      </text>
      <text fg={theme().colors.main}>saved texts</text>
      <ListView
        items={library.texts()}
        selected={selection.index()}
        height={Math.max(1, dimensions().height - 17)}
        empty="no saved texts"
        render={(text, active) => (
          <text fg={active ? theme().colors.main : theme().colors.text}>
            {active ? "›" : " "} {text.name} ·{" "}
            {text.settings.text.join(" ").length} characters
          </text>
        )}
      />
    </box>
  );
}
