import { useRenderer } from "@opentui/solid";
import { Show } from "solid-js";

import { openBrowser } from "../auth/browser";
import { useNotifications } from "../notifications";
import { useRouter } from "../router/router";
import { useScreenKeys } from "../shell/screen-keys";
import { useTheme } from "../theme/theme";
import { createAction } from "../ui/actions";

export function BrowserScreen() {
  const router = useRouter();
  const theme = useTheme();
  const renderer = useRenderer();
  const notifications = useNotifications();
  const action = createAction();
  useScreenKeys((event) => {
    if (event.eventType === "release") return;
    const handoff = router.handoff();
    if (handoff === undefined) return;
    if (event.name === "return") {
      event.preventDefault();
      void action.run(async () => {
        await openBrowser(handoff.url);
      });
    } else if (event.name === "c") {
      event.preventDefault();
      notifications.notify(
        renderer.copyToClipboardOSC52(handoff.url)
          ? "Link copied"
          : "Copy the displayed link manually",
      );
    }
  });
  return (
    <box flexDirection="column" gap={1}>
      <text fg={theme().colors.main}>
        {router.handoff()?.title ?? "browser action"}
      </text>
      <text fg={theme().colors.text} wrapMode="word">
        Complete this form and captcha in your browser. Sign in there if
        requested.
      </text>
      <text fg={theme().colors.main} wrapMode="word">
        {router.handoff()?.url}
      </text>
      <Show when={action.busy()}>
        <text fg={theme().colors.sub}>opening browser…</text>
      </Show>
      <text fg={theme().colors.sub}>
        enter open browser · c copy link · esc back
      </text>
    </box>
  );
}
