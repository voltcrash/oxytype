import { useTerminalDimensions } from "@opentui/solid";
import { TagNameSchema } from "@oxytype/schemas/users";
import { Show } from "solid-js";

import { useAccount } from "../account";
import { usePalette } from "../palette/palette";
import { useScreenKeys } from "../shell/screen-keys";
import { useTheme } from "../theme/theme";
import { createAction, requireSuccess } from "../ui/actions";
import { ListView } from "../ui/list-view";
import { createRemote, dataOrThrow } from "../ui/remote";
import { RemoteStatus } from "../ui/remote-status";
import { createSelection } from "../ui/selection";

export function TagsScreen() {
  const account = useAccount();
  const palette = usePalette();
  const theme = useTheme();
  const dimensions = useTerminalDimensions();
  const action = createAction();
  const tags = createRemote(async () => {
    if (account?.auth.user() === undefined) return undefined;
    return dataOrThrow(
      await account.api.client.users.getTags({ query: { client: "tui" } }),
    );
  });
  const items = () => tags.data() ?? [];
  const selection = createSelection(() => items().length);
  const selected = () => items()[selection.index()];
  const edit = (rename: boolean): void => {
    const tag = rename ? selected() : undefined;
    const uid = account?.auth.user()?.uid;
    if (uid === undefined || (rename && tag === undefined)) return;
    palette?.open({
      command: {
        id: rename ? "renameTag" : "addTag",
        display: rename ? "Rename tag" : "Add tag",
        input: {
          defaultValue: () => tag?.name ?? "",
          submit: async (value) => {
            const parsed = TagNameSchema.safeParse(value.trim());
            if (!parsed.success) return "Invalid tag name (max 16 characters)";
            if (account?.auth.user()?.uid !== uid) {
              return "Account changed; reopen tags";
            }
            await action.run(async () => {
              if (account === undefined) return;
              const response =
                tag === undefined
                  ? await account.api.client.users.createTag({
                      body: { tagName: parsed.data },
                    })
                  : await account.api.client.users.editTag({
                      body: { tagId: tag._id, newName: parsed.data },
                    });
              requireSuccess(response);
              tags.reload();
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
    if (event.name === "a") {
      event.preventDefault();
      edit(false);
    } else if (event.name === "e") {
      event.preventDefault();
      edit(true);
    } else if (event.name === "r" && !event.ctrl) {
      event.preventDefault();
      tags.reload();
    } else if (
      (event.name === "return" || event.name === "space") &&
      selected() !== undefined
    ) {
      event.preventDefault();
      account?.tags.toggle(selected()?._id ?? "");
    } else if (event.name === "d" && selected() !== undefined) {
      event.preventDefault();
      const tag = selected();
      const uid = account?.auth.user()?.uid;
      if (tag === undefined || uid === undefined) return;
      palette?.open({
        group: {
          title: `Delete tag ${tag.name}?`,
          list: [
            { id: "cancelDeleteTag", display: "Cancel" },
            {
              id: "deleteTag",
              display: "Delete tag",
              exec: async () =>
                action.run(async () => {
                  if (
                    account === undefined ||
                    account.auth.user()?.uid !== uid
                  ) {
                    throw new Error("Account changed");
                  }
                  requireSuccess(
                    await account.api.client.users.deleteTag({
                      params: { tagId: tag._id },
                    }),
                  );
                  account.tags.set(
                    account.tags.active().filter((id) => id !== tag._id),
                  );
                  tags.reload();
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
      <text fg={theme().colors.main}>
        tags · active tags apply to the next test
      </text>
      <Show
        when={account?.auth.user()}
        fallback={<text fg={theme().colors.sub}>log in to manage tags</text>}
      >
        <RemoteStatus
          loading={tags.loading() || action.busy()}
          error={tags.error()}
        />
        <ListView
          items={items()}
          selected={selection.index()}
          height={Math.max(1, dimensions().height - 10)}
          empty="no tags yet"
          render={(tag, active) => (
            <text fg={active ? theme().colors.main : theme().colors.text}>
              {active ? "›" : " "}{" "}
              {account?.tags.active().includes(tag._id) ? "[x]" : "[ ]"}{" "}
              {tag.name}
            </text>
          )}
        />
        <text fg={theme().colors.sub}>
          ↑↓ select · space active · a add · e rename · d delete · r reload
        </text>
      </Show>
    </box>
  );
}
