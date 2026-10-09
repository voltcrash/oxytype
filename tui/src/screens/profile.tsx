import { useTerminalDimensions } from "@opentui/solid";
import { browserHandoffUrl } from "@oxytype/schemas/browser-handoff";
import { UserNameWithoutFilterSchema } from "@oxytype/schemas/users";
import { createSignal, Show } from "solid-js";

import { useAccount } from "../account";
import { usePalette } from "../palette/palette";
import { useRouter } from "../router/router";
import { useScreenKeys } from "../shell/screen-keys";
import { useTheme } from "../theme/theme";
import { ProfileStats } from "../ui/profile-stats";
import { createRemote, dataOrThrow } from "../ui/remote";
import { RemoteStatus } from "../ui/remote-status";

export function ProfileScreen() {
  const account = useAccount();
  const router = useRouter();
  const palette = usePalette();
  const theme = useTheme();
  const dimensions = useTerminalDimensions();
  const [client, setClient] = createSignal<"tui" | "web">("tui");
  const [page, setPage] = createSignal(0);
  const profile = createRemote(async () => {
    const name = router.profileName();
    if (account === undefined || name === "") return undefined;
    return dataOrThrow(
      await account.api.client.users.getProfile({
        params: { uidOrName: name },
        query: { client: client(), isUid: false },
      }),
    );
  });
  useScreenKeys((event) => {
    if (event.eventType === "release") return;
    if (event.name === "tab") {
      event.preventDefault();
      setClient((value) => (value === "tui" ? "web" : "tui"));
      setPage(0);
    } else if (event.name === "up" || event.name === "down") {
      event.preventDefault();
      setPage((value) => Math.max(0, value + (event.name === "up" ? -1 : 1)));
    } else if (event.name === "r" && !event.ctrl) {
      event.preventDefault();
      profile.reload();
    } else if (event.name === "b" && profile.data() !== undefined) {
      event.preventDefault();
      router.openHandoff(
        "Report user",
        browserHandoffUrl(
          account?.api.settings.assetUrl ?? "https://oxytype.voltcrash.com",
          {
            action: "user-report",
            username: profile.data()?.name ?? router.profileName(),
          },
        ),
      );
    } else if (event.name === "/" || event.name === "return") {
      event.preventDefault();
      palette?.open({
        command: {
          id: "profileName",
          display: "View public profile",
          input: {
            defaultValue: router.profileName,
            submit: (value) => {
              const parsed = UserNameWithoutFilterSchema.safeParse(
                value.trim(),
              );
              if (!parsed.success) return "Enter a username";
              router.openProfile(parsed.data);
              setPage(0);
              return undefined;
            },
          },
        },
      });
    }
  });
  return (
    <box flexDirection="column" gap={1}>
      <text fg={theme().colors.main}>
        profile · {router.profileName() || "enter username"} · {client()}
      </text>
      <RemoteStatus loading={profile.loading()} error={profile.error()} />
      <Show when={profile.data()}>
        {(value) => (
          <ProfileStats
            profile={value()}
            height={Math.max(1, dimensions().height - 14)}
            page={page()}
          />
        )}
      </Show>
      <text fg={theme().colors.sub}>
        / username · tab TUI/web · ↑↓ PB pages · r reload · b report in browser
      </text>
    </box>
  );
}
