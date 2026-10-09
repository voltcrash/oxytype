import { useTerminalDimensions } from "@opentui/solid";
import { ConfigGroupNameSchema } from "@oxytype/schemas/configs";
import {
  PresetNameSchema,
  PresetSchema,
  type Preset,
} from "@oxytype/schemas/presets";
import { Show } from "solid-js";

import { useAccount } from "../account";
import {
  presetConfig,
  presetIncludesTags,
  presetSnapshot,
} from "../config/presets";
import { useConfig } from "../config/store";
import { usePalette } from "../palette/palette";
import { useScreenKeys } from "../shell/screen-keys";
import { useTheme } from "../theme/theme";
import { createAction, requireSuccess } from "../ui/actions";
import { KeyHints, parseHints } from "../ui/key-hints";
import { ListView } from "../ui/list-view";
import { createRemote, dataOrThrow } from "../ui/remote";
import { RemoteStatus } from "../ui/remote-status";
import { createSelection } from "../ui/selection";

export function PresetsScreen() {
  const account = useAccount();
  const store = useConfig();
  const palette = usePalette();
  const theme = useTheme();
  const dimensions = useTerminalDimensions();
  const action = createAction();
  const presets = createRemote(async () => {
    if (account?.auth.user() === undefined) return undefined;
    return dataOrThrow(await account.api.client.presets.get());
  });
  const items = () => presets.data() ?? [];
  const selection = createSelection(() => items().length);
  const selected = () => items()[selection.index()];
  const edit = (preset?: Preset): void => {
    const uid = account?.auth.user()?.uid;
    if (uid === undefined) return;
    palette?.open({
      command: {
        id: "savePreset",
        display:
          preset === undefined
            ? "Save preset (name; optional groups)"
            : "Rename preset",
        input: {
          placeholder: "name; test,behavior (omit groups for full config)",
          defaultValue: () => preset?.name ?? "",
          submit: async (value) => {
            const [name, groupInput] = value.split(";");
            const parsed = PresetNameSchema.safeParse(name?.trim());
            if (!parsed.success) return "Invalid name (1–16 characters)";
            const parsedGroups =
              groupInput === undefined
                ? undefined
                : PresetSchema.shape.settingGroups.safeParse(
                    groupInput.split(",").map((it) => it.trim()),
                  );
            if (parsedGroups !== undefined && !parsedGroups.success) {
              return `Groups: ${ConfigGroupNameSchema.options.join(", ")}`;
            }
            const groups = parsedGroups?.data;
            if (account?.auth.user()?.uid !== uid) return "Account changed";
            await action.run(async () => {
              if (account === undefined) return;
              requireSuccess(
                preset === undefined
                  ? await account.api.client.presets.add({
                      body: {
                        name: parsed.data,
                        settingGroups: groups ?? null,
                        config: presetSnapshot(
                          store.config,
                          account.tags.active(),
                          groups,
                        ),
                      },
                    })
                  : await account.api.client.presets.save({
                      body: { _id: preset._id, name: parsed.data },
                    }),
              );
              presets.reload();
            });
            return undefined;
          },
        },
      },
    });
  };
  useScreenKeys((event) => {
    if (event.eventType === "release") return;
    if (event.ctrl || event.meta) {
      selection.handleKey(event);
      return;
    }
    const preset = selected();
    const uid = account?.auth.user()?.uid;
    if (event.name === "a") {
      event.preventDefault();
      edit();
    } else if (event.name === "e" && preset !== undefined) {
      event.preventDefault();
      edit(preset);
    } else if (event.name === "r" && !event.ctrl) {
      event.preventDefault();
      presets.reload();
    } else if (event.name === "return" && preset !== undefined) {
      event.preventDefault();
      const partial =
        preset.settingGroups !== undefined && preset.settingGroups !== null;
      store.apply(
        partial
          ? {
              ...store.config,
              ...presetConfig(
                { ...store.config, ...preset.config },
                preset.settingGroups,
              ),
            }
          : preset.config,
      );
      if (presetIncludesTags(preset.settingGroups)) {
        account?.tags.set(preset.config.tags ?? []);
      }
    } else if (event.name === "s" && preset !== undefined) {
      event.preventDefault();
      palette?.open({
        group: {
          title: `Replace ${preset.name} with current settings?`,
          list: [
            { id: "cancelSavePreset", display: "Cancel" },
            {
              id: "overwritePreset",
              display: "Save current settings",
              exec: async () =>
                action.run(async () => {
                  if (
                    account === undefined ||
                    account.auth.user()?.uid !== uid
                  ) {
                    throw new Error("Account changed");
                  }
                  requireSuccess(
                    await account.api.client.presets.save({
                      body: {
                        _id: preset._id,
                        name: preset.name,
                        config: presetSnapshot(
                          store.config,
                          account.tags.active(),
                          preset.settingGroups,
                        ),
                      },
                    }),
                  );
                  presets.reload();
                }),
            },
          ],
        },
      });
    } else if (event.name === "d" && preset !== undefined) {
      event.preventDefault();
      palette?.open({
        group: {
          title: `Delete ${preset.name}?`,
          list: [
            { id: "cancelDeletePreset", display: "Cancel" },
            {
              id: "deletePreset",
              display: "Delete preset",
              exec: async () =>
                action.run(async () => {
                  if (
                    account === undefined ||
                    account.auth.user()?.uid !== uid
                  ) {
                    throw new Error("Account changed");
                  }
                  requireSuccess(
                    await account.api.client.presets.delete({
                      params: { presetId: preset._id },
                    }),
                  );
                  presets.reload();
                }),
            },
          ],
        },
      });
    } else {
      selection.handleKey(event);
    }
  });
  return (
    <box flexDirection="column" gap={1}>
      <text fg={theme().colors.main}>presets</text>
      <Show
        when={account?.auth.user()}
        fallback={<text fg={theme().colors.sub}>log in to manage presets</text>}
      >
        <RemoteStatus
          loading={presets.loading() || action.busy()}
          error={presets.error()}
        />
        <ListView
          items={items()}
          selected={selection.index()}
          height={Math.max(1, dimensions().height - 10)}
          empty="no presets yet"
          render={(preset) => (
            <text fg={theme().colors.text}>
              {preset.name} · {preset.settingGroups?.join(", ") ?? "full"}
            </text>
          )}
        />
        <KeyHints
          wrap
          hints={parseHints(
            "↑↓ select · enter apply · a add · e rename · s save current · d delete · r reload",
          )}
        />
      </Show>
    </box>
  );
}
