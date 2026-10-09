import { Show } from "solid-js";

import { useTheme } from "../theme/theme";

export function RemoteStatus(props: { loading: boolean; error?: string }) {
  const theme = useTheme();
  return (
    <>
      <Show when={props.loading}>
        <text fg={theme().colors.sub}>loading…</text>
      </Show>
      <Show when={props.error}>
        <text fg={theme().colors.error} wrapMode="word">
          {props.error} · r retry
        </text>
      </Show>
    </>
  );
}
