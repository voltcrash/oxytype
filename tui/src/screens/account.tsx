import { useTerminalDimensions } from "@opentui/solid";
import { createSignal, Show } from "solid-js";

import { useAccount } from "../account";
import { useAuth } from "../auth/store";
import { useRouter } from "../router/router";
import { useScreenKeys } from "../shell/screen-keys";
import { useTheme } from "../theme/theme";
import { KeyHints, parseHints } from "../ui/key-hints";
import { ProfileStats } from "../ui/profile-stats";
import { createRemote, dataOrThrow } from "../ui/remote";
import { RemoteStatus } from "../ui/remote-status";

export function AccountScreen() {
  const auth = useAuth();
  const account = useAccount();
  const theme = useTheme();
  const dimensions = useTerminalDimensions();
  const router = useRouter();
  const [client, setClient] = createSignal<"tui" | "web">("tui");
  const [page, setPage] = createSignal(0);
  const profile = createRemote(async () => {
    const user = auth?.user();
    if (!user || !account) return undefined;
    return account.api.client.users
      .getProfile({
        params: { uidOrName: user.uid },
        query: { client: client(), isUid: true },
      })
      .then(dataOrThrow);
  });
  useScreenKeys((event) => {
    if (auth === undefined || event.eventType === "release") return;
    if (event.ctrl || event.meta) return;
    if (event.name === "escape" && auth.state() === "authorizing") {
      event.preventDefault();
      auth.cancel();
    } else if (event.name === "return" && auth.user() === undefined) {
      event.preventDefault();
      void auth.login();
    } else if (event.name === "r" && !event.ctrl) {
      event.preventDefault();
      profile.reload();
      void auth.check();
    } else if (event.name === "tab") {
      event.preventDefault();
      setClient((value) => (value === "tui" ? "web" : "tui"));
      setPage(0);
    } else if (event.name === "down" || event.name === "up") {
      event.preventDefault();
      setPage((value) => Math.max(0, value + (event.name === "down" ? 1 : -1)));
    } else if (event.name === "h") {
      event.preventDefault();
      router.push("history");
    } else if (event.name === "t") {
      event.preventDefault();
      router.push("tags");
    } else if (event.name === "p") {
      event.preventDefault();
      router.push("presets");
    } else if (event.name === "l" && !event.ctrl) {
      event.preventDefault();
      void auth.logout();
    }
  });
  return (
    <box flexDirection="column" width="100%" gap={0}>
      <text fg={theme().colors.main}>account</text>
      <Show
        when={auth}
        fallback={
          <text fg={theme().colors.sub}>account service unavailable</text>
        }
      >
        {(store) => (
          <>
            <text fg={theme().colors.text}>
              {store().user()?.name ?? "not logged in"} · {store().state()}
            </text>
            <Show when={store().device()}>
              {(device) => (
                <>
                  <text fg={theme().colors.main}>
                    code {device().user_code}
                  </text>
                  <text fg={theme().colors.text} wrapMode="char">
                    {device().verification_uri_complete ??
                      device().verification_uri}
                  </text>
                  <text fg={theme().colors.sub}>
                    approve this code in your browser
                  </text>
                  <KeyHints hints={parseHints("esc cancel")} />
                </>
              )}
            </Show>
            <Show when={store().notice()}>
              {(notice) => <text fg={theme().colors.error}>{notice()}</text>}
            </Show>
            <KeyHints
              wrap
              hints={parseHints("enter log in · r reconnect · l log out")}
            />
            <Show when={account}>
              {(service) => (
                <>
                  <text fg={theme().colors.sub}>
                    config {service().sync.state()} ·{" "}
                    {
                      service()
                        .queue.entries()
                        .filter((entry) => entry.state === "pending").length
                    }{" "}
                    queued uploads
                  </text>
                  <text fg={theme().colors.error}>
                    {service().sync.notice() ??
                      service().uploads.notice() ??
                      service().queue.notice() ??
                      ""}
                  </text>
                </>
              )}
            </Show>
          </>
        )}
      </Show>
      <Show when={auth?.user()}>
        <text fg={theme().colors.main}>
          {client()} stats · tab switch client · ↑↓ PB pages
        </text>
        <RemoteStatus loading={profile.loading()} error={profile.error()} />
        <Show when={profile.data()}>
          {(value) => (
            <ProfileStats
              profile={value()}
              height={Math.max(1, dimensions().height - 20)}
              page={page()}
            />
          )}
        </Show>
        <KeyHints wrap hints={parseHints("h history · t tags · p presets")} />
      </Show>
    </box>
  );
}
