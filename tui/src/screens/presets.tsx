import { useTerminalDimensions } from "@opentui/solid";
import {
  ConfigGroupNameSchema,
  type Config,
  type ConfigGroupName,
  type PartialConfig,
} from "@oxytype/schemas/configs";
import { PresetNameSchema, type Preset } from "@oxytype/schemas/presets";
import { sharedConfigMetadata } from "@oxytype/typing-core/config/metadata";
import { Show } from "solid-js";

import { useAccount } from "../account";
import { useConfig } from "../config/store";
import { usePalette } from "../palette/palette";
import { useScreenKeys } from "../shell/screen-keys";
import { useTheme } from "../theme/theme";
import { createAction, requireSuccess } from "../ui/actions";
import { ListView } from "../ui/list-view";
import { createRemote, dataOrThrow } from "../ui/remote";
import { RemoteStatus } from "../ui/remote-status";
import { createSelection } from "../ui/selection";

export function presetConfig(
  config: Readonly<Config>,
  groups?: ConfigGroupName[] | null,
): PartialConfig {
  return Object.fromEntries(
    Object.entries(config).filter(
      ([key]) =>
        groups === undefined ||
        groups === null ||
        groups.includes(sharedConfigMetadata[key as keyof Config]?.group),
    ),
  );
}

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
                : ConfigGroupNameSchema.array()
                    .min(1)
                    .safeParse(groupInput.split(",").map((it) => it.trim()));
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
                        config: {
                          ...presetConfig(store.config, groups),
                          tags: account.tags.active(),
                        },
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
      if (preset.config.tags !== undefined) {
        account?.tags.set(preset.config.tags);
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
                        config: {
                          ...presetConfig(store.config, preset.settingGroups),
                          tags: account.tags.active(),
                        },
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
          render={(preset, active) => (
            <text fg={active ? theme().colors.main : theme().colors.text}>
              {active ? "›" : " "} {preset.name} ·{" "}
              {preset.settingGroups?.join(", ") ?? "full"}
            </text>
          )}
        />
        <text fg={theme().colors.sub}>
          ↑↓ select · enter apply · a add · e rename · s save current · d delete
          · r reload
        </text>
      </Show>
    </box>
  );
}
