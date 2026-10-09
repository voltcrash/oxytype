import { Show } from "solid-js";

import { useAccount } from "../account";
import { useAuth } from "../auth/store";
import { useScreenKeys } from "../shell/screen-keys";
import { useTheme } from "../theme/theme";

export function AccountScreen() {
  const auth = useAuth();
  const account = useAccount();
  const theme = useTheme();
  useScreenKeys((event) => {
    if (auth === undefined || event.eventType === "release") return;
    if (event.name === "escape" && auth.state() === "authorizing") {
      event.preventDefault();
      auth.cancel();
    } else if (event.name === "return" && auth.user() === undefined) {
      event.preventDefault();
      void auth.login();
    } else if (event.name === "r" && !event.ctrl) {
      event.preventDefault();
      void auth.check();
    } else if (event.name === "l" && !event.ctrl) {
      event.preventDefault();
      void auth.logout();
    }
  });
  return (
    <box flexDirection="column" width="100%" gap={1}>
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
                    approve this code in your browser · esc cancel
                  </text>
                </>
              )}
            </Show>
            <Show when={store().notice()}>
              {(notice) => <text fg={theme().colors.error}>{notice()}</text>}
            </Show>
            <text fg={theme().colors.sub}>
              enter log in · r reconnect · l log out
            </text>
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
    </box>
  );
}
